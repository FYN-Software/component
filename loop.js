'use strict';

import Generic from './generic.js';
import * as Extends from './extends.js';
import * as Glp from '../glp/index.js';

export default class Loop
{
    constructor(node, data)
    {
        this._node = node;
        this._data = data;
        this._template = new DocumentFragment();
    
        const name = this._data.name;
        const n = `${name.upperCaseFirst()}LoopItem`;
        this._item = window.customElements.get(n.toDashCase()) ||
            new Glp.Generation.Class(n)
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
        
        Array.from(node.children).forEach(n => {
            if(n instanceof HTMLSlotElement)
            {
                const r = () => {
                    this._template = new DocumentFragment();
    
                    for(let el of n.assignedElements({flatten: true}))
                    {
                        this._template.appendChild(el.cloneNode(true))
                    }
    
                    Array.from(this.children).forEach(c => c.template = this._template.cloneNode(true));
                };
                
                n.on({
                    slotchange: e => r(),
                });
                
                r();
                n.style.display = 'none';
            }
            else
            {
                this._template.appendChild(n.extract());
            }
        });

        node.setAttribute('scroller', '');
        
        Object.defineProperty(node, '__loop__', {
            value: this,
            writable: false,
        });
    }

    render()
    {
        this._node.style.setProperty('--scroller-height', `${50 * this._data.length}px`);

        for(let [i, item, c] of this._data)
        {
            let node;

            if(this.children.length <= c)
            {
                node = new (this._item)(this._template.cloneNode(true));

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
}
