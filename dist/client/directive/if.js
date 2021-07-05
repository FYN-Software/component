import Template from '../template.js';
import Directive from './directive.js';
export default class If extends Directive {
    _fragment;
    _initialized = Promise.resolve();
    constructor(node, binding, scopes, { fragment }) {
        super(node, binding, scopes);
        this._fragment = fragment;
        this._initialized = this._initialize();
    }
    async _initialize() {
    }
    async render() {
        const element = this.node;
        element.setAttribute('hidden', '');
        await this._initialized;
        const value = Boolean(await this.binding.value);
        element.attributes.setOnAssert(value === false, 'hidden');
        if (value) {
            element.innerHTML = '';
            const { template, bindings } = await Template.hydrate(this.scopes, this._fragment.clone());
            element.appendChild(template);
            await Template.processBindings(bindings, this.scopes);
        }
    }
}
//# sourceMappingURL=if.js.map