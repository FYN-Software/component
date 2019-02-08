import './extends.js';
import Generic from './generic.js';
import Class from './code/class.js';
import Method from './code/method.js';

export default class Loop
{
    constructor(node, name, parent = null)
    {
        Object.defineProperty(node, 'loop', {
            value: this,
            writable: false,
        });

        this._node = node;
        this._name = name;
        this._parent = parent;
        this._data = [];
        this._template = new DocumentFragment();

        Array.from(node.children).forEach(n =>
        {
            if(n instanceof HTMLSlotElement)
            {
                const r = () =>
                {
                    const old = this._template;
                    this._template = new DocumentFragment();

                    for(let el of n.assignedNodes({ flatten: true }))
                    {
                        this._template.appendChild(el.cloneNode(true));
                    }

                    Array.from(this.children).forEach(c => c.template = this._template.cloneNode(true));

                    this._node.emit('templatechange', {
                        old,
                        new: this._template,
                        loop: this,
                    });
                };

                n.on({ slotchange: r });
                n.style.display = 'none';

                setTimeout(r, 0);
            }
            else
            {
                this._template.appendChild(n.extract());
            }
        });

        node.setAttribute('scroller', '');
    }

    render()
    {
        // TODO(Chris Kruining)
        //  Implement virtual scrolling
        // This._node.style.setProperty('--scroller-height', `${50 * this._data.length}px`);

        // NOTE(Chris Kruining)
        // This double entries allows me to also iterate over objects
        const d = Object.entries(Object.entries(this._data))
            .map(([ c, i ]) => [ Number(c), i ]);

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
                    console.error(this._item, this._template);

                    throw e;
                }

                this._node.appendChild(node);
            }
            else
            {
                node = this.children[c];
            }

            node.__this__ = this._parent;
            node[this._name] = it;
        }

        while(this._data.length < this.children.length)
        {
            this.children[this._data.length].remove();
        }
    }

    get data()
    {
        return this._data;
    }

    set data(d)
    {
        if(d instanceof Promise)
        {
            d.then(d => {
                this._data = d;

                this.render();
            });
        }
        else
        {
            this._data = d;
        }
    }

    get children()
    {
        return this._node.querySelectorAll(':scope > :not(slot)');
    }

    get item()
    {
        if(this._item === undefined)
        {
            const n = `${this._name.upperCaseFirst()}LoopItem`;

            this._item = window.customElements.get(n.toDashCase())
                || new Class(n)
                    .extends(Generic)
                    .addMethod(
                        new Method('properties')
                            .getter()
                            .body(`return this._properties.${this._name};`)
                    )
                    .addMethod(
                        new Method('properties')
                            .static()
                            .getter()
                            .body(`return { ${this._name}: null, __this__: null };`)
                    )
                    .code;
        }

        return new (this._item)(this._template.cloneNode(true));
    }

    get parent()
    {
        return this._parent;
    }
}
