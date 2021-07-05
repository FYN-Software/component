import Directive from './directive.js';
import Template from '../template.js';
export default class Switch extends Directive {
    _defaultCase;
    _cases;
    _items = [];
    _initialized;
    constructor(node, binding, scopes, { defaultCase, cases }) {
        super(node, binding, scopes);
        this._defaultCase = defaultCase;
        this._cases = cases;
        this._initialized = this._initialize();
    }
    async _initialize() {
        this._items = [];
    }
    async render() {
        const element = this.node;
        element.setAttribute('hidden', '');
        await this._initialized;
        const current = element.querySelector('[case]');
        if (current !== null) {
            current.remove();
        }
        const value = String(await this.binding.value);
        const fragment = this._cases.get(value) ?? this._defaultCase;
        const { template, bindings } = await Template.hydrate(this.scopes, fragment);
        element.appendChild(template);
        await Template.processBindings(bindings, this.scopes);
        element.removeAttribute('hidden');
    }
}
//# sourceMappingURL=switch.js.map