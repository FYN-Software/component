import Base from '../base.js';
import { Component } from '../fyn.js';
import Directive from './directive.js';

// TODO(Chris Kruining)
//  This directive should add the binding created
//  from its template to the owner, now values wont
//  get rendered due to this disconnect!
export default class Switch extends Directive
{
    #template = new DocumentFragment();
    #items = [];
    #initialized = Promise.resolve(null);

    constructor(owner, scope, node, binding)
    {
        super(owner, scope, node, binding);

        for(let skip = 0; node.childNodes.length > skip;)
        {
            const c = node.childNodes[skip];

            if(c instanceof HTMLSlotElement)
            {
                skip++;
                c.setAttribute('hidden', '');

                let ready_cb;
                this.#initialized = new Promise(r => ready_cb = r);

                c.on({
                    slotchange: async () => {
                        ready_cb();

                        await this.#initialized;

                        const old = this.#template;
                        this.#template = new DocumentFragment();

                        for(const el of c.assignedNodes({ flatten: true }))
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
                this.#template.appendChild(c);
            }
        }

        this.#initialized = this.__initialize();
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

        const current = this.node.querySelector('[case]');
        if(current !== null)
        {
            current.remove();
        }

        const value = String(await this.binding.value);
        const element = this.cases.find(c => c.getAttribute('case') === value)
            || this.#template.querySelector(':scope > [default]') || document.createTextNode('');

        const { html: node, bindings } = await Base.parseHtml(this.owner, this.scope, element.cloneNode(true), Object.keys(this.scope.properties));

        this.node.appendChild(node);

        await Promise.all(bindings.map(b => b.resolve(this.scope, this.owner)));
        await Promise.all(bindings.map(b => b.nodes).reduce((t, n) => [ ...t, ...n ], []).unique().map(n => Base.render(n)));

        this.node.removeAttribute('hidden');
    }

    get cases()
    {
        return Array.from(this.#template.querySelectorAll(':scope > [case]'));
    }
}