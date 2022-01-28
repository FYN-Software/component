import lock from '@fyn-software/core/lock.js';
import Directive from './directive.js';
import { hydrate, processBindings } from '../template.js';
import { delay } from '@fyn-software/core/function/promise.js';
export default class For extends Directive {
    #key;
    #name;
    #fragment;
    #items = [];
    #initialized;
    constructor(node, binding, scopes, { fragments, name = 'it', key = name }) {
        super(node, binding, scopes);
        for (const scope of scopes) {
            scope.viewModel.on({ changed: () => this.render() });
        }
        this.#name = name;
        this.#key = key;
        this.#fragment = fragments[node.getRootNode().host?.getAttribute('data-id') ?? '']
            ?? fragments.__root__;
        this.#initialized = this.#initialize();
    }
    get fragment() {
        return this.#fragment;
    }
    set fragment(fragment) {
        this.#fragment = fragment;
        this.#initialized = this.#initialize();
        this.emit('templateChange', fragment);
        this.node.innerHTML = '';
        void this.render();
    }
    async #initialize() {
        this.#items = [];
    }
    async render() {
        await this.#initialized;
        await lock(this, async () => {
            const value = await this.binding.value;
            let count = 0;
            for await (const [c, k, it] of valueIterator(value)) {
                count = c + 1;
                const scope = { properties: { [this.#key]: k, [this.#name]: it } };
                const scopes = [...this.scopes, scope];
                if (this.#items.length <= c) {
                    const { template, bindings } = await hydrate(scopes, this.#fragment.clone());
                    this.#items.push({ nodes: Array.from(template.childNodes), bindings });
                    if (template instanceof DocumentFragment) {
                        await Promise.all(Array
                            .from(template.querySelectorAll(':defined'))
                            .map(el => el.isReady ?? Promise.resolve(null)));
                    }
                    this.node.appendChild(template);
                }
                await processBindings(this.#items[c].bindings, scopes);
            }
            const toRemove = this.#items.splice(count, this.#items.length - count);
            for (const { nodes } of toRemove) {
                for (const node of nodes) {
                    this.node.removeChild(node);
                }
            }
            await delay(0);
            this.node.emit('rendered');
        });
    }
}
async function* valueIterator(value) {
    if (typeof value?.[Symbol.asyncIterator] === 'function') {
        let i = 0;
        for await (const v of value) {
            yield [i, i, v];
            i++;
        }
    }
    else if (typeof value?.[Symbol.iterator] === 'function') {
        let i = 0;
        for (const v of value) {
            yield [i, i, v];
            i++;
        }
    }
    else {
        let i = 0;
        for await (const [k, v] of Object.entries(value ?? {})) {
            yield [i, k, v];
            i++;
        }
    }
}
//# sourceMappingURL=for.js.map