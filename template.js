import Binding, {AsyncFunction} from './binding.js';
import Directive from './directive/directive.js';

export const regex = /{{\s*(?<variable>.+?)\s*}}/g;

export default class Template
{
    static #directives = new WeakMap();

    static async parseHtml(owner, scope, html, properties, allowedKeys)
    {
        const bindings = new Map();

        for(const node of this.#iterator(html))
        {
            const str = node.nodeValue;
            const nodeBindings = new Set();

            for(const [ original, variable ] of Array.from(str.matchAll(regex), m => [ m[0], m.groups.variable ]))
            {
                if(bindings.has(variable) === false)
                {
                    const keys = allowedKeys.filter(k => variable.includes(k)).unique();
                    const callable = this.#asSandboxedCallable(keys, variable);

                    const binding = new Binding(original, variable, keys, callable);
                    await binding.resolve(scope, owner);
                    bindings.set(variable, binding);
                }

                const binding = bindings.get(variable);

                // NOTE(Chris Kruining)
                // To make sure structures like for
                // directives can update on a 'imported'
                // variable register a change listener
                const props = Object.keys(properties);
                for(const [, prop ] of variable.matchAll(/this\.([a-zA-Z_][a-zA-Z0-9_]*)/g))
                {
                    if(props.includes(prop) === false)
                    {
                        continue;
                    }

                    owner.observe({
                        [prop]: async (o, n) => {
                            await binding.resolve(scope, owner);
                            await this.render(node);
                        },
                    });
                }

                // NOTE(Chris Kruining)
                // Detect and create directives
                if(node.nodeType === 2 && node.localName.startsWith(':'))
                {
                    const directive = await Directive.get(node.localName.substr(1));

                    if(this.#directives.has(node.ownerElement) === false)
                    {
                        this.#directives.set(node.ownerElement, {});
                    }

                    this.#directives.get(node.ownerElement)[node.localName] = new directive(owner, scope, node.ownerElement, binding);
                }

                nodeBindings.add(binding);
                binding.nodes.add(node);
            }

            Object.defineProperty(node, 'template', { value: str });
            Object.defineProperty(node, 'bindings', { value: Array.from(nodeBindings) });
        }

        return { html, bindings: Array.from(bindings.values()) };
    }

    static #asSandboxedCallable(keys, variable)
    {
        try
        {
            const func = new AsyncFunction('sandbox', `try { with(sandbox){ return await ${variable}; } } catch { return undefined; }`);
            return async function(...args)
            {
                const sandbox = new Proxy(
                    {
                        // Add arguments to the sandbox
                        ...Object.fromEntries(args.map((a, i) => [keys[i], a])),
                        // whitelisted globals
                        Math,
                        JSON,
                    },
                    {
                        has: () => true,
                        get: (t, k) => k === Symbol.unscopables ? undefined : t[k],
                    }
                );

                return await func.call(this, sandbox);
            };
        }
        catch (e)
        {
            return new AsyncFunction('return undefined;');
        }
    }

    static *#iterator(node)
    {
        switch(node.nodeType)
        {
            case 1:
                // TODO(Chris Kruining) Fix this nasty hack.
                //  Maybe I could add a directive for template injection into slots?
                //  08-10-2020 :: I just checked, still in use, non the less, should implement alternative using template element
                if(node.hasAttribute('template'))
                {
                    node.removeAttribute('template');

                    return;
                }

                for(const a of node.attributes)
                {
                    yield* this.#iterator(a);
                }

            case 11:
                for(const c of node.childNodes)
                {
                    yield* this.#iterator(c);
                }

                break;

            case 2:
            case 3:
                let m = node.nodeValue.match(regex);

                if(m !== null)
                {
                    node.matches = m;
                    yield node;
                }

                break;
        }
    }

    static async render(node)
    {
        const v = await (node.bindings.length === 1 && node.bindings[0].original === node.template
                ? node.bindings[0].value
                : Promise.all(node.bindings.map(b => b.value.then(v => [ b.expression, v ])))
                    .then(Object.fromEntries)
                    .then(v => node.template.replace(regex, (a, m) => {
                        const value = v[m];

                        return value;
                    }))
        );

        if(
            node.nodeType === 2
            && node.localName.startsWith(':')
            && this.#directives.has(node.ownerElement)
            && this.#directives.get(node.ownerElement).hasOwnProperty(node.localName)
        ) {
            await this.#directives.get(node.ownerElement)[node.localName].render();
        }
        else if(node.nodeType === 2 && node.ownerElement.hasOwnProperty(node.localName.toCamelCase()))
        {
            node.ownerElement[node.localName.toCamelCase()] = v;
        }
        else
        {
            try
            {
                node.nodeValue = v;
            }
            catch(e)
            {
                console.trace(this, v);

                throw e;
            }
        }
    }
}