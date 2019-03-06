import '../core/extends.js';
import Type from '../data/type/type.js';
import Generic from './generic.js';
import Class from './code/class.js';
import Method from './code/method.js';

const _data = Symbol('data');
const _node = Symbol('node');
const _name = Symbol('name');
const _parent = Symbol('parent');
const _template = Symbol('template');

export default class Loop
{
    constructor(node, name, parent)
    {
        Object.defineProperty(node, 'loop', {
            value: this,
            writable: false,
        });

        this[_data] = [];
        this[_node] = node;
        this[_name] = name;
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

        let nodesToAppend = document.createDocumentFragment();

        for(const [ c, [ , it ] ] of d)
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
            }

            node[this[_name]] = it;
        }

        this[_node].appendChild(nodesToAppend);

        while(this[_data].length < this.children.length)
        {
            this.children[this[_data].length].remove();
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
            const n = `${this[_name].capitalize()}LoopItem`;

            this._item = window.customElements.get(n.toDashCase())
                || new Class(n)
                    .extends(Generic)
                    .addMethod(
                        new Method('properties')
                            .getter()
                            .body(`return this._properties.${this[_name]};`)
                    )
                    .addMethod(
                        new Method('properties')
                            .static()
                            .getter()
                            .body(`return { ${this[_name]}: null, __this__: null };`)
                    )
                    .code;
        }

        const item = new (this._item)(this[_template].cloneNode(true));
        item.__this__ = this[_parent];

        return item;
    }
}
