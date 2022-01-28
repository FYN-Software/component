import { hydrate, processBindings } from '../template.js';
import Directive from './directive.js';
export default class Template extends Directive {
    _fragment;
    _initialized;
    constructor(node, binding, scopes, { fragments }) {
        super(node, binding, scopes);
        this._fragment = fragments[node.getRootNode().host.getAttribute('data-id') ?? '']
            ?? fragments.__root__;
        this._initialized = this._initialize();
    }
    async _initialize() {
    }
    async render() {
        await this._initialized;
        const [key, templates] = await this.binding.value;
        const fragment = templates[key] ?? this._fragment;
        this.node.innerHTML = '';
        const { template, bindings } = await hydrate(this.scopes, fragment.clone());
        this.node.appendChild(template);
        await processBindings(bindings, this.scopes);
    }
}
//# sourceMappingURL=template.js.map