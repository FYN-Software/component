import { Component } from '../fyn.js';
import Directive from './directive.js';

const _template = Symbol('template');

export default class Switch extends Directive
{
    constructor(node, binding)
    {
        super(node, binding);

        this[_template] = new DocumentFragment();

        Promise.delay(1).then(() => this._clearToTemplate());
    }

    render(value)
    {
        this._clearToTemplate();

        const element = this.cases.find(c => c.getAttribute('case') === value)
            || this[_template].querySelector(':scope > [default]');

        if((element instanceof Node) === false)
        {
            return;
        }

        this.node.appendChild(element);
    }

    _clearToTemplate()
    {
        while(this.node.children.length > 0)
        {
            this[_template].appendChild(this.node.children[0]);
        }
    }

    get cases()
    {
        return Array.from(this[_template].querySelectorAll(':scope > [case]'));
    }
}