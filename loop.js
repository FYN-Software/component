'use strict';

import Generic from './generic.js';
import * as Glp from '../glp/index.js';

export default class Loop
{
    constructor(node, data)
    {
        this._node = node;
        this._data = data;
        this._template = new DocumentFragment();

        Array.from(node.children).forEach(n => this._template.appendChild(node.removeChild(n)));
    }

    render()
    {
        const name = this._data.name;

        for(let [i, item, c] of this._data)
        {
            let node;

            if(this.children.length <= c)
            {
                const C = window.customElements.get(`fyn${name.upperCaseFirst()}LoopItem`.toDashCase())
                    || new Glp.Generation.Class(`${name.upperCaseFirst()}LoopItem`)
                        .extends(Generic)
                        .addMethod(
                            new Glp.Generation.Method('properties')
                                .static()
                                .getter()
                                .body(`return { ${name}: null };`)
                        )
                        .code;

                node = new C(this._template.cloneNode(true));

                this._node.appendChild(node);
            }
            else
            {
                node = this.children[c];
            }

            node[name] = item;
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
        return this._node.children;
    }
}
