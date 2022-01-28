import { hydrate, processBindings } from '../template.js';
import Directive from './directive.js';
import { setAttributeOnAssert } from '@fyn-software/core/function/dom.js';
export default class If extends Directive {
    #fragment;
    #initialized = Promise.resolve();
    constructor(node, binding, scopes, { fragments }) {
        super(node, binding, scopes);
        this.#fragment = fragments[node.getRootNode().host?.getAttribute('data-id') ?? '']
            ?? fragments.__root__;
        this.#initialized = this.#initialize();
    }
    async #initialize() {
    }
    async render() {
        const element = this.node;
        element.setAttribute('hidden', '');
        await this.#initialized;
        const value = Boolean(await this.binding.value);
        setAttributeOnAssert(element, value === false, 'hidden');
        if (value) {
            element.innerHTML = '';
            const { template, bindings } = await hydrate(this.scopes, this.#fragment.clone());
            element.appendChild(template);
            await processBindings(bindings, this.scopes);
        }
    }
}
//# sourceMappingURL=if.js.map