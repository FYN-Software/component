import lock from '../../core/lock.js';
import Component from '../component.js';
import Template, { uuidRegex } from '../template.js';
import Directive from './directive.js';
import Base from '../base.js';

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

        // if(node.children[0] instanceof HTMLSlotElement && node.children[0].hasAttribute('passthrough')) // TODO(Chris Kruining) Implement :for-static for slots
        // {
        //     const slot  = node.children[0];
        //     slot.setAttribute('hidden', '');
        //
        //     let ready_cb;
        //     this.#initialized = new Promise(r => ready_cb = r);
        //
        //     slot.on({
        //         slotchange: async () => {
        //             ready_cb();
        //
        //             await this.#initialized;
        //
        //             const old = this.#template;
        //             this.#template = new DocumentFragment();
        //
        //             let elements = slot.assignedNodes({ flatten: true });
        //
        //             if(elements.length === 0)
        //             {
        //                 elements = slot.childNodes ?? [];
        //             }
        //
        //             for(const el of elements)
        //             {
        //                 this.#template.appendChild(el.cloneNode(true));
        //             }
        //
        //             this.#initialized = this.__initialize();
        //
        //             node.emit('templatechange', {
        //                 old,
        //                 new: this.#template.cloneNode(true),
        //                 directive: this,
        //             });
        //         },
        //     }).trigger('slotchange');
        // }
        // else
        // {
        //     let index = 0;
        //
        //     while (node.childNodes.length > index)
        //     {
        //         const child = node.childNodes[index];
        //
        //         if(child.nodeType === 1 && child.hasAttribute('for-static'))
        //         {
        //             index++;
        //
        //             continue;
        //         }
        //
        //         this.#template.appendChild(child);
        //     }
        //
        //     this.#initialized = this.__initialize();
        // }
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

            for await (const [ c, k, it ] of valueIterator(value))
            {
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
        });

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