import Templating from '../template.js';
import Directive from './directive.js';
export default class Template extends Directive {
    _fragment;
    _initialized;
    constructor(node, binding, scopes, { fragment }) {
        super(node, binding, scopes);
        this._fragment = fragment;
        this._initialized = this._initialize();
    }
    async _initialize() {
    }
    async render() {
        await this._initialized;
        const [key, templates] = await this.binding.value;
        const fragment = templates[key] ?? this._fragment;
        this.node.innerHTML = '';
        const { template, bindings } = await Templating.hydrate(this.scopes, fragment.clone());
        this.node.appendChild(template);
        await Templating.processBindings(bindings, this.scopes);
    }
}
//# sourceMappingURL=template.js.map