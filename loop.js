import './extends.js';
import Generic from './generic.js';
import * as Glp from '../glp/index.js';

export default class Loop
{
    constructor(node, data)
    {
        Object.defineProperty(node, 'loop', {
            value: this,
            writable: false,
        });

        this._node = node;
        this._data = data;
        this._template = new DocumentFragment();

        Array.from(node.children).forEach(n =>
        {
            if(n instanceof HTMLSlotElement)
            {
                const r = () =>
                {
                    const old = this._template;
                    this._template = new DocumentFragment();

                    for(let el of n.assignedElements({ flatten: true }))
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

                n.on({ slotchange: () => r() });

                r();
                n.style.display = 'none';
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
        // TODO(Chris Kruining) Implement virtual scrolling

        // NOTE(Chris Kruining) This is disabled until proper virtual scrolling is implemented
        // This._node.style.setProperty('--scroller-height', `${50 * this._data.length}px`);

        for(let [ , item, c ] of this._data)
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

            node[this._data.name] = item;
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

    get children()
    {
        return this._node.querySelectorAll(':scope > :not(slot)');
    }

    get item()
    {
        if(this._item === undefined)
        {
            const name = this._data.name;


            const n = `${name.upperCaseFirst()}LoopItem`;
            this._item = window.customElements.get(n.toDashCase())
                || new Glp.Generation.Class(n)
                    .extends(Generic)
                    .addMethod(
                        new Glp.Generation.Method('properties')
                            .getter()
                            .body(`return this._properties.${name};`)
                    )
                    .addMethod(
                        new Glp.Generation.Method('properties')
                            .static()
                            .getter()
                            .body(`return { ${name}: null };`)
                    )
                    .code;
        }

        return new (this._item)(this._template.cloneNode(true));
    }
}
