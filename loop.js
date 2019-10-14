import '../core/extends.js';
import Type from '../data/type/type.js';
import Generic from './generic.js';
import Component from './component.js';

const _data = Symbol('data');
const _node = Symbol('node');
const _name = Symbol('name');
const _key = Symbol('key');
const _parent = Symbol('parent');
const _template = Symbol('template');

export default class Loop
{
    #data = [];
    #node;
    #key;
    #name;
    #parent;
    #template = new DocumentFragment();

    constructor(node, name, parent)
    {
        try
        {
            Object.defineProperty(node, 'loop', {
                value: this,
                writable: false,
            });
        }
        catch(e)
        {
            console.error(node, e);
        }

        const keys = name.split(/,\s*/g);

        this.#node = node;
        this.#key = keys.first;
        this.#name = keys.last;
        this.#parent = parent;

        Array.from(node.children).forEach(n =>
        {
            if(n instanceof HTMLSlotElement)
            {
                const r = () => {
                    const old = this.#template;
                    this.#template = new DocumentFragment();

                    for(let el of n.assignedNodes({ flatten: true }))
                    {
                        el = el.cloneNode(true);

                        if(el.nodeType === 1 && el.hasAttribute('template'))
                        {
                            el.removeAttribute('template');
                        }

                        this.#template.appendChild(el);
                    }

                    Array.from(this.children).forEach(c => c.template = this.#template.cloneNode(true));

                    this.children.clear();
                    this.render();

                    this.#node.emit('templatechange', {
                        old,
                        new: this.#template.cloneNode(true),
                        loop: this,
                    });
                };

                n.on({ slotchange: r });
                n.style.display = 'none';

                setTimeout(r, 0);
            }
            else
            {
                this.#template.appendChild(n.extract());
            }
        });

        this.#node.setAttribute('scroller', '');
    }

    render()
    {
        // TODO(Chris Kruining)
        //  Implement virtual scrolling
        // This[node].style.setProperty('--scroller-height', `${50 * this[data].length}px`);

        this.children.forEach(c => c.setAttribute('hidden', ''));

        // NOTE(Chris Kruining)
        // This double entries allows me to also iterate over objects
        const d = Object.entries(Object.entries(this.#data))
            .map(([ c, i ]) => [ Number(c), i ]);

        // console.log(this.#data, d);

        let nodesToAppend = document.createDocumentFragment();

        for(const [ c, [ k, it ] ] of d)
        {
            let node;

            if(this.children.length <= c)
            {
                try
                {
                    node = this.item;
                }
                catch(e)
                {
                    console.error(this._item, this.#template);

                    throw e;
                }

                nodesToAppend.appendChild(node);
            }
            else
            {
                node = this.children[c];
                node.removeAttribute('hidden');
            }

            node[this.#key] = k;
            node[this.#name] = it;
        }

        this.#node.appendChild(nodesToAppend);
    }

    get data()
    {
        return this.#data;
    }

    set data(d)
    {
        this.#data = d;
    }

    get children()
    {
        return this.#node.querySelectorAll(':scope > :not(slot)');
    }

    get item()
    {
        if(this._item === undefined)
        {
            const it = `${this.#key.capitalize()}${this.#name.capitalize()}LoopItem`.toDashCase();

            this._item = window.customElements.get(it);

            if(this._item === undefined)
            {
                const key = this.#key;
                const name = this.#name;

                this._item = Component.register(
                    class extends Generic
                    {
                        static get properties()
                        {
                            return {
                                [key]: new Type,
                                [name]: new Type,
                                __this__: null,
                            };
                        }
                    },
                    it
                );
            }
        }

        return new (this._item)(this.#template.cloneNode(true), this.#parent);
    }
}
