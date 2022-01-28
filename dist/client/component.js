import Base from './base.js';
import { hydrate, mapFor } from './template.js';
import Fragment from './fragment.js';
import { delay } from '@fyn-software/core/function/promise.js';
export default class Component extends Base {
    static __observerLimit__ = Component;
    static localName;
    #ready;
    #sugar = new Proxy({}, { get: (c, p) => this.shadow.getElementById(p) });
    constructor(args = {}) {
        new.target.define();
        super(args);
        this.#ready = this.init();
    }
    async init() {
        await delay(0);
        await super.init();
        Object.defineProperties(this.shadow, {
            style: {
                value: new CSSStyleSheet(),
                writable: false,
                configurable: false,
                enumerable: true,
            },
        });
        await this.initialize();
        const { bindings } = await hydrate([this], new Fragment(this.shadow, mapFor(this.localName)));
        super.bindings = bindings;
        await this._populate();
        await this.ready();
        this.emit('ready');
    }
    get $() {
        return this.#sugar;
    }
    static get is() {
        return this.localName || `${this.name.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`).substr(1)}`;
    }
    static define() {
        if (globalThis.customElements.get(this.is) === undefined) {
            globalThis.customElements.define(this.is, this);
        }
    }
}
//# sourceMappingURL=component.js.map