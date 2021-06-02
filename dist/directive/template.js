import Templating from '../template.js';
import Directive from './directive.js';
export default class Template extends Directive {
    constructor(owner, scope, node, binding, { fragment }) {
        super(owner, scope, node, binding);
        this._fragment = fragment;
        this._initialized = this._initialize();
    }
    async _initialize() {
        await this._fragment.load();
    }
    async render() {
        await this._initialized;
        const [key, templates] = await this.binding.value;
        const fragment = templates[key] ?? this._fragment;
        // const fragment = this._templates.get(value) ?? this._fragment;
        this.node.innerHTML = '';
        const { template, bindings } = await Templating.parseHtml(this.owner, this.scope, fragment, this.owner.properties);
        this.node.appendChild(template);
        await Promise.all(bindings.map(b => b.resolve(this.scope, this.owner)));
        await Promise.all(bindings.map(b => b.nodes)
            .reduce((t, n) => [...t, ...n], [])
            .unique()
            .map(n => Templating.render(n)));
    }
}
//# sourceMappingURL=template.js.map