import Base from '../base.js';
import {Component} from '../fyn.js';
import Directive from './directive.js';

// TODO(Chris Kruining)
//  This directive should add the binding created
//  from its template to the owner, now values wont
//  get rendered due to this disconnect!
export default class If extends Directive
{
    #template = new DocumentFragment();
    #items = [];
    #initialized = Promise.resolve(null);

    constructor(owner, scope, node, binding)
    {
        super(owner, scope, node, binding);

        while (node.childNodes.length > 0)
        {
            this.#template.appendChild(node.childNodes[0]);
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
        const value = Boolean(await this.binding.value);

        if(value)
        {
            this.node.innerHTML = '';

            const { html: node, bindings } = await Base.parseHtml(this.owner, this.scope, this.#template.cloneNode(true), Object.keys(this.scope.properties));

            this.node.appendChild(node);

            await Promise.all(bindings.map(b => b.resolve(this.scope, this.owner)));
            await Promise.all(bindings.map(b => b.nodes).reduce((t, n) => [ ...t, ...n ], []).unique().map(n => Base.render(n)));
        }

        this.node.attributes.setOnAssert(value === false, 'hidden');
    }
}