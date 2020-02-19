import Component from '../component.js';
import Directive from './directive.js';
import { AsyncFunction } from '../binding.js';
import Base from '../base.js';

const hackedLimit = 10;

export default class For extends Directive
{
    #key;
    #name;
    #template = new DocumentFragment();
    #items = [];
    #initialized = Promise.resolve(null);

    constructor(owner, scope, node, binding)
    {
        super(owner, scope, node, binding);

        const [ name, variable ] = binding.expression.split(/\s+(?:of|in)\s+/);

        const keys = name.match(/^\[?\s*(?:(\S+?)\s*(?:,|:)\s*)?\s*(\S+?)]?$/).reverse();

        this.#name = keys[0] || 'it';
        this.#key = keys[1] || this.#name;

        binding.callable = new AsyncFunction(
            ...binding.keys,
            `try { return ${variable}; } catch { return undefined; }`
        );

        if(node.childNodes[0] instanceof HTMLSlotElement) // TODO(Chris Kruining) Implement :for-static for slots
        {
            const slot  = node.childNodes[0];
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
            let index = 0;

            while (node.childNodes.length > index)
            {
                const child = node.childNodes[index];

                if(child.nodeType === 1 && child.hasAttribute('for-static'))
                {
                    index++;

                    continue;
                }

                this.#template.appendChild(child);
            }

            this.#initialized = this.__initialize();
        }

        this.node.setAttribute('virtual-scroller', '');
    }

    async __initialize()
    {
        this.#items = [];

        await Promise.all(
            Array.from(this.#template.querySelectorAll(':not(:defined)'))
                .unique()
                .map(n => Component.load(n.localName))
        );
    }

    async render()
    {
        this.node.setAttribute('hidden', '');

        await this.#initialized;

        const nodesToAppend = new DocumentFragment();
        const v = await this.binding.value;
        const d = Object.entries(Object.entries(v && v.hasOwnProperty(Symbol.iterator) ? Array.from(v) : (v || {})))
            .map(([ c, i ]) => [ Number(c), i ]);

        for (const [ c, [ k, it ] ] of d)
        {
            // TODO(Chris Kruining) Implement actual virtual scrolling...
            if(c >= hackedLimit)
            {
                break;
            }

            const scope = { properties: { [this.#key]: k, [this.#name]: it } };

            if(c < hackedLimit && this.#items.length <= c)
            {
                const { html: node, bindings } = await Base.parseHtml(this.owner, scope, this.#template.cloneNode(true), [ this.#key, this.#name ]);

                this.#items.push({ nodes: Array.from(node.childNodes), bindings });

                Array.from(node.children).forEach(c => c.setAttribute('hidden', ''));
                nodesToAppend.appendChild(node);
            }

            const { nodes, bindings } = this.#items[c];

            for(const node of nodes.filter(n => n.nodeType === 1))
            {
                node.removeAttribute('hidden');
                node.setAttribute('index', c);
            }

            await Promise.all(bindings.map(b => b.resolve(scope, this.owner)));
            await Promise.all(bindings.map(b => b.nodes).reduce((t, n) => [ ...t, ...n ], []).unique().map(n => Base.render(n)));
        }

        for(const i of range(Math.min(10, d.length), this.#items.length))
        {
            Array.from(this.#items[i].nodes).filter(n => n.nodeType === 1).forEach(c => c.setAttribute('hidden', ''));
        }

        this.node.appendChild(nodesToAppend);
        this.node.removeAttribute('hidden');
    }

    get template()
    {
        return Base.parseHtml(this.scope, this.#template.cloneNode(true), [ this.#key, this.#name ]);
    }
}