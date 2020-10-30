import Base from '../base.js';
import { Component } from '../fyn.js';
import Template from '../template.js';
import Directive from './directive.js';

// TODO(Chris Kruining)
//  This directive should add the binding created
//  from its template to the owner, now values wont
//  get rendered due to this disconnect!
export default class If extends Directive
{
    #fragment;
    #items = [];
    #initialized = Promise.resolve(null);

    constructor(owner, scope, node, binding, { fragment })
    {
        super(owner, scope, node, binding);

        this.#fragment = fragment;
        this.#initialized = this.__initialize();
    }

    async __initialize()
    {
        this.#items = [];

        await this.#fragment.load();
    }

    async render()
    {
        this.node.setAttribute('hidden', '');

        await this.#initialized;
        const value = Boolean(await this.binding.value);

        this.node.attributes.setOnAssert(value === false, 'hidden');

        if(value)
        {
            this.node.innerHTML = '';

            const { template, bindings } = await Base.parseHtml(this.owner, this.scope, this.#fragment);

            this.node.appendChild(template);

            await Promise.all(bindings.map(b => b.resolve(this.scope, this.owner)));
            await Promise.all(bindings.map(b => b.nodes).reduce((t, n) => [ ...t, ...n ], []).unique().map(n => Template.render(n)));
        }
    }
}