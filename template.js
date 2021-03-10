import Type from '../data/type/type.js';
import Binding from './binding.js';
import Fragment from './fragment.js';
import Directive from './directive/directive.js';
import plugins from './plugins.js';
import Plugin from './plugin/plugin.js';

export const regex = /{{\s*(.+?)\s*}}/g;
export const uuidRegex = /{#([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})}/g;
export const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

export default class Template
{
    static #directives = new WeakMap();
    static #templates = new WeakMap();
    static #bindings = new WeakMap();

    // - Find template strings :: `{{ some random js }}`
    // - Replace each place with a UUID
    // - return changes html and map of `UUID: sandboxedFunction`
    static async scan(fragment, allowedKeys)
    {
        const cache = new Map();
        const map = new Map();

        for await (const { node, directive } of this.#iterator(fragment))
        {
            node.nodeValue = node.nodeValue.replaceAll(regex, (original, code) => {
                if(cache.has(code) === false)
                {
                    const id = this.#uuid();
                    const keys = allowedKeys.filter(k => code.includes(k)).unique();
                    const args = [ ...keys, ...plugins.keys() ];
                    const callable = this.asSandboxedCallable(args, code);

                    cache.set(code, id);
                    map.set(id, {
                        original,
                        code,
                        keys,
                        callable,
                    });
                }

                return `{#${cache.get(code)}}`;
            });

            if(directive !== null)
            {
                await directive.scan(node, map, allowedKeys);
            }
        }

        return new Fragment(fragment, map);
    }

    static async scanSlot(slot, allowedKeys, clone = true)
    {
        const template = new DocumentFragment();
        for(const el of slot.assignedNodes({ flatten: true }))
        {
            const child = clone
                ? el.cloneNode(true)
                : el;

            template.appendChild(child);
        }

        return await Template.scan(template, allowedKeys);
    }

    static async parseHtml(owner, scope, fragment, properties)
    {
        const { template, map } = fragment.clone();
        const bindings = new Map();

        for await (const { node } of this.#iterator(template))
        {
            const str = node.nodeValue;
            const nodeBindings = new Set();

            for(const [ tag, uuid ] of Array.from(str.matchAll(uuidRegex), m => [ ...m ]))
            {
                const { original, code, keys, callable, directive } = map.get(uuid);

                if(bindings.has(uuid) === false)
                {
                    const binding = new Binding(tag, original, code, keys, callable);

                    // NOTE(Chris Kruining) Test which plugins are used and add the binding to that plugin
                    await Plugin.discover(plugins, scope, binding, (...wrappedArgs) => {
                        const args = Object.entries(scope.properties)
                            .filter(([ k ]) => keys.includes(k))
                            .map(([ , p ]) => p instanceof Type ? p.$.value : p)

                        return callable.apply(scope, [ ...args, ...wrappedArgs ]);
                    });

                    await binding.resolve(scope, owner);

                    bindings.set(uuid, binding);
                }

                const binding = bindings.get(uuid);

                // NOTE(Chris Kruining)
                // To make sure structures like for
                // directives can update on a 'imported'
                // variable register a change listener
                const props = Object.keys(properties);
                for(const [, prop ] of code.matchAll(/this\.([a-zA-Z_][a-zA-Z0-9_]*)/g))
                {
                    if(props.includes(prop) === false) // could be `allowedKeys` ?????
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
                if(directive !== undefined)
                {
                    if(this.#directives.has(node.ownerElement) === false)
                    {
                        this.#directives.set(node.ownerElement, {});
                    }

                    const directiveClass = await Directive.get(directive.type);

                    this.#directives.get(node.ownerElement)[node.localName] = new directiveClass(owner, scope, node.ownerElement, binding, directive);
                }

                nodeBindings.add(binding);
                binding.nodes.add(node);
            }

            this.#templates.set(node, str);
            this.#bindings.set(node, Array.from(nodeBindings));
        }

        return { template, bindings: Array.from(bindings.values()) };
    }

    static async render(node)
    {
        if(
            node.nodeType === 2
            && node.localName.startsWith(':')
            && this.#directives.get(node.ownerElement)?.hasOwnProperty(node.localName)
        ) {
            return await this.#directives.get(node.ownerElement)[node.localName].render();
        }

        const bindings = this.#bindings.get(node);
        const template = this.#templates.get(node);
        const v = await (bindings.length === 1 && bindings[0].tag === template
                ? bindings[0].value
                : Promise.all(bindings.map(b => b.value.then(v => [ b.tag, v ])))
                    .then(Object.fromEntries)
                    .then(v => template.replace(uuidRegex, m => v[m]))
        );

        // NOTE(Chris Kruining)
        //  Changed from `hasOwnProperty` to `in` I'm
        //  far from certain this is correct. CHECK IT!
        // if(node.nodeType === 2 && (node.localName.toCamelCase() in node.ownerElement))
        if(node.nodeType === 2 && node.ownerElement.hasOwnProperty(node.localName.toCamelCase()))
        {
            node.ownerElement[node.localName.toCamelCase()] = v;
        }
        // else if(node.nodeType === 2 && (node.localName.toCamelCase() in node.ownerElement) && node.ownerElement.localName.includes('-') === false)
        // {
        //     node.ownerElement[node.localName.toCamelCase()] = v;
        // }
        else
        {
            try
            {
                node.nodeValue = v;
            }
            catch(e)
            {
                throw e;
            }
        }
    }

    static getDirectivesFor(node)
    {
        return this.#directives.get(node);
    }

    static async *#iterator(node)
    {
        switch(node.nodeType)
        {
            case 1: // Element
                // TODO(Chris Kruining) Fix this nasty hack.
                //  Maybe I could add a directive for template injection into slots?
                //  08-10-2020 :: I just checked, still in use, non the less,
                //  should implement alternative using template element
                if(node.hasAttribute('template'))
                {
                    node.removeAttribute('template');

                    return;
                }

                for(const a of Array.from(node.attributes).sort(a => a.localName.startsWith(':') ? -1 : 1))
                {
                    yield* this.#iterator(a);
                }

            case 11: // Template
                for(const c of node.childNodes)
                {
                    yield* this.#iterator(c);
                }

                break;

            case 2: // Attribute
            case 3: // Text
                const m = node.nodeValue.match(regex) || node.nodeValue.match(uuidRegex);

                if(m !== null)
                {
                    yield { node, directive: node.localName?.startsWith(':') ? await Directive.get(node.localName?.substr(1)) : null };
                }

                break;
        }
    }

    static asSandboxedCallable(keys, variable)
    {
        const code = `
            const sandbox = new Proxy({ Math, JSON, Date, range, ${keys.join(', ')} }, {
                has: () => true,
                get: (t, k) => k === Symbol.unscopables ? undefined : t[k],
            });
            
            try
            {
                with(sandbox)
                {
                    return await ${variable};
                }
            }
            catch
            {
                return undefined; 
            }
        `;

        try
        {
            return new AsyncFunction(...keys, code);
        }
        catch
        {
            return new AsyncFunction('return undefined;');
        }
    }

    static #uuid()
    {
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
    }

    static #hashSum(str)
    {
        let hash = 0;

        for (let i = 0; i < str.length; i++)
        {
            hash = (((hash << 5) - hash) + str.charCodeAt(i)) | 0;
        }

        return hash;
    }
}