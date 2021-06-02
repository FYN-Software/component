import Templateting from '@fyn-software/component/template.js';
import Base from '@fyn-software/component/base.js';
import Directive from './directive.js';

export default class Template extends Directive
{
    #fragment;
    #templates = new Map;
    #initialized = Promise.resolve(null);

    constructor(owner, scope, node, binding, { fragment })
    {
        super(owner, scope, node, binding);

        this.#fragment = fragment;
        this.#initialized = this.__initialize();
    }

    async __initialize()
    {
        await this.#fragment.load();
    }

    async render()
    {
        await this.#initialized;

        const [ key, templates ] = await this.binding.value;
        const fragment = templates[key] ?? this.#fragment;
        // const fragment = this.#templates.get(value) ?? this.#fragment;

        this.node.innerHTML = '';

        const { template, bindings } = await Base.parseHtml(this.owner, this.scope, fragment);

        this.node.appendChild(template);

        await Promise.all(bindings.map(b => b.resolve(this.scope, this.owner)));
        await Promise.all(bindings.map(b => b.nodes).reduce((t, n) => [ ...t, ...n ], []).unique().map(n => Templateting.render(n)));
    }
}