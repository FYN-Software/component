import Base from './base.js';
import { clone } from '@fyn-software/core/extends.js';
import Template from './template.js';
import Fragment from './fragment.js';
export default class Component extends Base {
    _ready;
    _sugar = new Proxy({}, { get: (c, p) => this.shadow.getElementById(p) });
    static localName;
    constructor(args = {}) {
        new.target.define();
        super(args);
        this._ready = this.init();
    }
    async init() {
        await Promise.delay(0);
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
        const { bindings } = await Template.hydrate([this], new Fragment(this.shadow, Template.mapFor(this.localName)));
        super.bindings = bindings;
        await this._populate();
        await this.ready();
        this.emit('ready');
    }
    async animateKey(key, timing) {
        const constructor = this.constructor;
        let options = clone(constructor.animations[key]);
        while (options[1].hasOwnProperty('extend')) {
            const newOptions = clone(constructor.animations[options[1].extend] ?? [[], {}]);
            delete options[1].extend;
            options = [newOptions[0], { ...newOptions[1], ...options[1] }];
        }
        const animation = super.animate(...options);
        if (animation.effect === undefined || timing === null) {
            const duration = animation.effect?.getTiming().duration ?? 0;
            await Promise.delay(duration * (timing ?? 0));
            return animation;
        }
        return animation.finished;
    }
    get $() {
        return this._sugar;
    }
    get isReady() {
        return this._ready;
    }
    static get is() {
        return this.localName || `${this.name.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`).substr(1)}`;
    }
    static get animations() {
        return {};
    }
    static define() {
        if (globalThis.customElements.get(this.is) === undefined) {
            globalThis.customElements.define(this.is, this);
        }
    }
}
//# sourceMappingURL=component.js.map