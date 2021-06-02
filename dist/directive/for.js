import lock from '@fyn-software/core/lock.js';
import Directive from './directive.js';
import Template, { uuidRegex } from '../template.js';
import Component from '../component.js';
export default class For extends Directive {
    constructor(owner, scope, node, binding, { fragment, name = 'it', key = name }) {
        super(owner, scope, node, binding);
        this._items = [];
        this._name = name;
        this._key = key;
        this._fragment = fragment;
        this._initialized = this._initialize();
    }
    get fragment() {
        return this._fragment;
    }
    set fragment(fragment) {
        // console.log(fragment);
        // console.log(fragment.template.innerHTML);
        this._fragment = fragment;
        this._initialized = this._initialize();
        this.node.innerHTML = '';
        void this.render();
    }
    async _initialize() {
        this._items = [];
        await this._fragment.load();
    }
    async render() {
        await this._initialized;
        await lock(this, async () => {
            const value = await this.binding.value;
            let count = 0;
            for await (const [c, k, it] of valueIterator(value)) {
                count = c + 1;
                const scope = { properties: { [this._key]: { value: k }, [this._name]: { value: it } } };
                if (this._items.length <= c) {
                    const { template, bindings } = await Template.parseHtml(this.owner, scope, this._fragment.clone(), this.owner.properties);
                    this._items.push({ nodes: Array.from(template.childNodes), bindings });
                    // Wait for all components to be ready
                    await Promise.all(Array
                        .from(template.querySelectorAll(':defined'))
                        .filter(el => el instanceof Component)
                        .map(el => el.isReady));
                    this.node.appendChild(template);
                }
                const { nodes, bindings } = this._items[c];
                for (const node of nodes) {
                    For._indices.set(node, c);
                }
                // resolve values and render them.
                await Promise.all(bindings.map(b => b.resolve(scope, this.owner)));
                await Promise.all(bindings
                    .map(b => b.nodes)
                    .reduce((t, n) => [...t, ...n], [])
                    .unique()
                    .map(n => Template.render(n)));
            }
            // Remove "overflow"
            const toRemove = this._items.splice(count, this._items.length - count);
            for (const { nodes } of toRemove) {
                for (const node of nodes) {
                    node.remove();
                }
            }
            //NOTE(Chris Kruining) with a 0 delay in order to allow the browser to actually render the results
            await Promise.delay(0);
            this.node.emit('rendered');
        });
    }
    static async scan(node, map) {
        const [, uuid] = node.nodeValue.match(new RegExp(uuidRegex, ''));
        const mapping = map.get(uuid);
        const [n, variable] = mapping.code.split(/\s+(?:of|in)\s+/);
        const [name = 'it', key = name] = n.match(/^\[?\s*(?:(\S+?)\s*(?:,|:)\s*)?\s*(\S+?)]?$/).reverse();
        const fragment = await super.scan(node, map, [key, name]);
        mapping.callable = {
            args: mapping.keys,
            code: Template.asSandboxedCodeString(mapping.keys, variable)
        };
        mapping.directive = {
            ...mapping.directive,
            name,
            key,
        };
        return fragment;
    }
    static async deserialize(mapping) {
        await super.deserialize(mapping);
    }
    static get indices() {
        return this._indices;
    }
}
For._indices = new WeakMap;
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