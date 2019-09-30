import Directive from './directive.js';

const _template = Symbol('template');

export default class For extends Directive
{
    constructor(node, binding)
    {
        super(node, binding);

        this[_template] = new DocumentFragment();

        while(node.children.length > 0)
        {
            this[_template].appendChild(node.children[0]);
        }

        console.log(node, this[_template], binding);
    }

    render()
    {
        console.log(this);
    }
}