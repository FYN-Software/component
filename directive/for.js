import lock from '@fyn-software/core/lock.js';
import Template, { uuidRegex } from '@fyn-software/component/template.js';
import Base from '@fyn-software/component/base.js';
import Component from '@fyn-software/component/component.js';
import Directive from '@fyn-software/component/directive/directive.js';

export default class For extends Directive
{
    #key;
    #name;
    #fragment;
    #items = [];
    #initialized = Promise.resolve(null);

    constructor(owner, scope, node, binding, { fragment, name = 'it', key = name })
    {
        super(owner, scope, node, binding);

        this.#name = name;
        this.#key = key;
        this.#fragment = fragment;
        this.#initialized = this.__initialize();
    }

    get fragment()
    {
        return this.#fragment;
    }

    set fragment(fragment)
    {
        this.#fragment = fragment;
        this.#initialized = this.__initialize();

        const _ = this.render();
    }

    async __initialize()
    {
        this.#items = [];

        await this.#fragment.load();
    }

    async render()
    {
        await this.#initialized;

        await lock(this, async () => {
            const value = await this.binding.value;
            let count;

            for await (const [ c, k, it ] of valueIterator(value))
            {
                count = c + 1;

                const scope = { properties: { [this.#key]: Number.tryParseInt(k), [this.#name]: it } };

                if(this.#items.length <= c)
                {
                    const { template, bindings } = await Base.parseHtml(this.owner, scope, this.#fragment);

                    this.#items.push({ nodes: Array.from(template.childNodes), bindings });

                    // Wait for all components to be ready
                    await Promise.all(
                        Array
                            .from(template.querySelectorAll(':defined'))
                            .filter(el => el instanceof Component)
                            .map(el => el.isReady)
                    );

                    this.node.appendChild(template);
                }

                const { nodes, bindings } = this.#items[c];

                for(const node of nodes.filter(n => n.nodeType === 1))
                {
                    node.setAttribute('index', c);
                }

                // resolve values and render them.
                await Promise.all(bindings.map(b => b.resolve(scope, this.owner)));
                await Promise.all(
                    bindings
                        .map(b => b.nodes)
                        .reduce((t, n) => [ ...t, ...n ], [])
                        .unique()
                        .map(n => {
                            return Template.render(n)
                        })
                );
            }

            // Remove "overflow"
            const toRemove = this.#items.splice(count, this.#items.length - count);

            for(const { nodes } of toRemove)
            {
                for(const node of nodes)
                {
                    node.remove();
                }
            }
        });

        //NOTE(Chris Kruining) with a 0 delay in order to allow the browser to actually render the results
        await Promise.delay(0);

        this.node.emit('rendered');
    }

    static async scan(node, map)
    {
        const [ , uuid ] = node.nodeValue.match(new RegExp(uuidRegex, ''));
        const mapping = map.get(uuid);

        const [ n, variable ] = mapping.code.split(/\s+(?:of|in)\s+/);
        const [ name = 'it', key = name ] = n.match(/^\[?\s*(?:(\S+?)\s*(?:,|:)\s*)?\s*(\S+?)]?$/).reverse();
        const fragment = await super.scan(node, map, [ key, name ]);

        mapping.callable = Template.asSandboxedCallable(mapping.keys, variable);
        mapping.directive = {
            ...mapping.directive,
            name,
            key,
        };

        return fragment;
    }
}

async function *valueIterator(value)
{
    try
    {
        if (typeof value?.[Symbol.asyncIterator] === 'function')
        {
            let i = 0;
            for await(const v of value)
            {
                yield [i, i, v];

                i++;
            }
        }
        else if (typeof value?.[Symbol.iterator] === 'function')
        {
            let i = 0;
            for (const v of value)
            {
                yield [i, i, v];

                i++;
            }
        }
        else
        {
            let i = 0;
            for await(const [k, v] of Object.entries(value ?? {}))
            {
                yield [i, k, v];

                i++;
            }
        }
    }
    catch (e)
    {
        console.trace(value);
        throw e;
    }
}