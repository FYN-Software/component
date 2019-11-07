import {objectFromEntries} from '../../core/extends.js';
import Event from '../../core/event.js';
import Type from '../../data/type/type.js';
import Directive from './directive.js';
import Binding, { AsyncFunction } from '../binding.js';
import Base, { regex } from '../base.js';

export default class For extends Directive
{
    #key;
    #name;
    #template = new DocumentFragment();
    #items = [];
    #initialized = Promise.resolve(null);

    constructor(scope, node, binding)
    {
        super(scope, node, binding);

        const [ name, variable ] = binding.expression.split(/\s+(?:of|in)\s+/);

        const keys = name.match(/^\[?\s*(\S+?)\s*(?:(?:,|:)\s*(\S+?)\s*)?]?$/).reverse();

        this.#name = keys[1] || 'it';
        this.#key = keys[0] || this.#name;

        binding.callable = new AsyncFunction(
            ...binding.keys,
            `try { return ${variable}; } catch { return undefined; }`
        );

        if(node.children[0] instanceof HTMLSlotElement)
        {
            const slot  = node.children[0];
            slot.setAttribute('hidden', '');

            let ready_cb;
            this.#initialized = new Promise(r => ready_cb = r);

            slot.on({
                slotchange: async () => {
                    ready_cb();

                    await this.#initialized;

                    const old = this.#template;
                    this.#template = new DocumentFragment();

                    for(const el of slot.assignedNodes({ flatten: true }))
                    {
                        this.#template.appendChild(el.cloneNode(true));
                    }

                    this.#initialized = this.__initialize();

                    node.emit('templatechange', {
                        old,
                        new: this.#template.cloneNode(true),
                        directive: this,
                    });
                },
            }).trigger('slotchange');
        }
        else
        {
            while (node.children.length > 0)
            {
                this.#template.appendChild(node.children[0]);
            }

            this.#initialized = this.__initialize();
        }

        this.node.setAttribute('virtual-scroller', '');
    }

    async __initialize()
    {
        this.#items = [];

        // const nodesToAppend = new DocumentFragment();
        //
        // for(const i of range(0, 10))
        // {
        //     const { html: node, bindings } = await Base.parseHtml(this.scope, this.#template.cloneNode(true), [ this.#key, this.#name ]);
        //
        //     this.#items.push({ nodes: Array.from(node.children), bindings });
        //
        //     Array.from(node.children).forEach(c => c.setAttribute('hidden', ''));
        //     nodesToAppend.appendChild(node);
        // }
        //
        // this.node.appendChild(nodesToAppend);
    }

    async render()
    {
        this.node.setAttribute('hidden', '');

        await this.#initialized;

        const nodesToAppend = new DocumentFragment();
        const d = Object.entries(Object.entries((await this.binding.value) || {}))
            .map(([ c, i ]) => [ Number(c), i ]);

        for (const [ c, [ k, it ] ] of d)
        {
            if(c < 10 && this.#items.length <= c)
            {
                const { html: node, bindings } = await Base.parseHtml(this.scope, this.#template.cloneNode(true), [ this.#key, this.#name ]);

                this.#items.push({ nodes: Array.from(node.children), bindings });

                Array.from(node.children).forEach(c => c.setAttribute('hidden', ''));
                nodesToAppend.appendChild(node);
            }

            const { nodes, bindings } = this.#items[c];

            for(const node of nodes)
            {
                node.removeAttribute('hidden');
                node.setAttribute('index', c);
            }

            await Promise.all(bindings.map(b => b.resolve({ properties: { [this.#key]: k, [this.#name]: it } }, this.scope)));
            await Promise.all(bindings.map(b => b.nodes).reduce((t, n) => [ ...t, ...n ], []).unique().map(n => Base.render(n)));
        }

        for(const i of range(d.length, this.#items.length))
        {
            Array.from(this.#items[i].nodes).forEach(c => c.setAttribute('hidden', ''));
        }

        this.node.appendChild(nodesToAppend);

        this.node.removeAttribute('hidden');
    }

    get template()
    {
        return Base.parseHtml(this.scope, this.#template.cloneNode(true), [ this.#key, this.#name ]);
    }
}