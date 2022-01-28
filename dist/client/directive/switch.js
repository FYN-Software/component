import Directive from './directive.js';
import { hydrate, processBindings } from '../template.js';
export default class Switch extends Directive {
    #defaultCase;
    #cases;
    #items = [];
    #initialized;
    constructor(node, binding, scopes, { defaultCase, cases }) {
        super(node, binding, scopes);
        this.#defaultCase = defaultCase;
        this.#cases = cases;
        this.#initialized = this.#initialize();
    }
    async #initialize() {
        this.#items = [];
    }
    async render() {
        const element = this.node;
        element.setAttribute('hidden', '');
        await this.#initialized;
        const current = element.querySelector('[case]');
        if (current !== null) {
            current.remove();
        }
        const value = String(await this.binding.value);
        const fragment = this.#cases.get(value) ?? this.#defaultCase;
        const { template, bindings } = await hydrate(this.scopes, fragment);
        element.appendChild(template);
        await processBindings(bindings, this.scopes);
        element.removeAttribute('hidden');
    }
}
//# sourceMappingURL=switch.js.map