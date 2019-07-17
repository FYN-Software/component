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

        this[_data] = [];
        this[_node] = node;
        this[_key] = keys.first;
        this[_name] = keys.last;
        this[_parent] = parent;
        this[_template] = new DocumentFragment();

        Array.from(node.children).forEach(n =>
        {
            if(n instanceof HTMLSlotElement)
            {
                const r = () => {
                    const old = this[_template];
                    this[_template] = new DocumentFragment();

                    for(let el of n.assignedNodes({ flatten: true }))
                    {
                        if(el.nodeType === 1 && el.hasAttribute('template'))
                        {
                            el.removeAttribute('template');
                        }

                        this[_template].appendChild(el.cloneNode(true));
                    }

                    Array.from(this.children).forEach(c => c.template = this[_template].cloneNode(true));

                    this.children.clear();
                    this.render();

                    this[_node].emit('templatechange', {
                        old,
                        new: this[_template].cloneNode(true),
                        loop: this,
                    });
                };

                n.on({ slotchange: r });
                n.style.display = 'none';

                setTimeout(r, 0);
            }
            else
            {
                this[_template].appendChild(n.extract());
            }
        });

        this[_node].setAttribute('scroller', '');
    }

    render()
    {
        // TODO(Chris Kruining)
        //  Implement virtual scrolling
        // This[node].style.setProperty('--scroller-height', `${50 * this[data].length}px`);

        // NOTE(Chris Kruining)
        // This double entries allows me to also iterate over objects
        const d = Object.entries(Object.entries(Array.from(this[_data])))
            .map(([ c, i ]) => [ Number(c), i ]);

        // console.log(this[_data]);

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
                    console.error(this._item, this[_template]);

                    throw e;
                }

                nodesToAppend.appendChild(node);
            }
            else
            {
                node = this.children[c];
                node.removeAttribute('hidden');
            }

            node[this[_key]] = k;
            node[this[_name]] = it;
        }

        this[_node].appendChild(nodesToAppend);

        while(this[_data].length < this.children.length)
        {
            this.children[this[_data].length].remove();
            this.children[this[_data].length] = undefined;
        }
    }

    get data()
    {
        return this[_data];
    }

    set data(d)
    {
        this[_data] = d;
    }

    get children()
    {
        return this[_node].querySelectorAll(':scope > :not(slot)');
    }

    get item()
    {
        if(this._item === undefined)
        {
            const it = `${this[_key].capitalize()}${this[_name].capitalize()}LoopItem`.toDashCase();

            this._item = window.customElements.get(it);

            if(this._item === undefined)
            {
                const key = this[_key];
                const name = this[_name];

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

        return new (this._item)(this[_template].cloneNode(true), this[_parent]);
    }
}
