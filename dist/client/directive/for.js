import lock from '@fyn-software/core/lock.js';
import Directive from './directive.js';
import Template from '../template.js';
import Component from '../component.js';
export default class For extends Directive {
    static _indices = new WeakMap;
    _key;
    _name;
    _fragment;
    _items = [];
    _initialized;
    constructor(node, binding, scopes, { fragment, name = 'it', key = name }) {
        super(node, binding, scopes);
        this._name = name;
        this._key = key;
        this._fragment = fragment;
        this._initialized = this._initialize();
    }
    get fragment() {
        return this._fragment;
    }
    set fragment(fragment) {
        this._fragment = fragment;
        this._initialized = this._initialize();
        this.node.innerHTML = '';
        void this.render();
    }
    async _initialize() {
        this._items = [];
    }
    async render() {
        await this._initialized;
        await lock(this, async () => {
            const value = await this.binding.value;
            let count = 0;
            for await (const [c, k, it] of valueIterator(value)) {
                count = c + 1;
                const scope = { properties: { [this._key]: { value: k }, [this._name]: { value: it } } };
                const scopes = [...this.scopes, scope];
                if (this._items.length <= c) {
                    const { template, bindings } = await Template.hydrate(scopes, this._fragment.clone());
                    this._items.push({ nodes: Array.from(template.childNodes), bindings });
                    if (template instanceof DocumentFragment) {
                        await Promise.all(Array
                            .from(template.querySelectorAll(':defined'))
                            .filter(el => el instanceof Component)
                            .map(el => el.isReady));
                    }
                    this.node.appendChild(template);
                }
                const { nodes, bindings } = this._items[c];
                for (const node of nodes) {
                    For._indices.set(node, c);
                }
                await Template.processBindings(bindings, scopes);
            }
            const toRemove = this._items.splice(count, this._items.length - count);
            for (const { nodes } of toRemove) {
                for (const node of nodes) {
                    node.remove();
                }
            }
            await Promise.delay(0);
            this.node.emit('rendered');
        });
    }
    static get indices() {
        return this._indices;
    }
}
async function* valueIterator(value) {
    try {
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
    catch (e) {
        console.trace(value);
        throw e;
    }
}
//# sourceMappingURL=for.js.map