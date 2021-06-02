import Base from './base.js';
import Composer from './composer.js';
import Style from '@fyn-software/core/style.js';
import { clone } from '@fyn-software/core/extends.js';
export default class Component extends Base {
    constructor(args = {}) {
        super(args);
        this._isReady = false;
        this._sugar = new Proxy({}, { get: (c, p) => this.shadow.getElementById(p) });
        const constructor = this.constructor;
        void constructor.init();
        if (Composer.fragments.hasOwnProperty(constructor.is) === false) {
            throw new Error('Expected a template, non found. did you register the component?');
        }
        this._ready = this.init();
    }
    async init() {
        await Promise.delay(0);
        await super.init();
        const self = this.constructor;
        const { html, css } = Composer.fragments[self.is];
        const sheet = new CSSStyleSheet();
        super.shadow.adoptedStyleSheets = Style.get(...self.styles).concat(css, sheet);
        sheet.insertRule(`:host{}`, 0);
        const rule = sheet.cssRules[0];
        Object.defineProperties(this.shadow, {
            setProperty: {
                value: rule.style.setProperty.bind(rule.style),
                writable: false,
                configurable: false,
                enumerable: true,
            },
            getPropertyValue: {
                value: rule.style.getPropertyValue.bind(rule.style),
                writable: false,
                configurable: false,
                enumerable: true,
            },
            style: {
                value: css,
                writable: false,
                configurable: false,
                enumerable: true,
            },
        });
        await this.initialize();
        const { bindings, template } = (await this.parseTemplate(await html))
            ?? { bindings: [], template: new DocumentFragment() };
        super.bindings = bindings;
        this._template = template;
        super.shadow.appendChild(this._template);
        this._isReady = true;
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
    async parseTemplate(fragment) {
        const { template, bindings } = await Base.parseHtml(this, this, fragment);
        await Composer.prepare(template);
        return { template, bindings };
    }
    get shadow() {
        return super.shadow;
    }
    get $() {
        return this._sugar;
    }
    get isReady() {
        return this._ready;
    }
    /**
     * @deprecated
     */
    static async fromString(tag, properties) {
        throw new Error('Do not use this method anymore');
    }
    static async init() {
        await Composer.registerComponent(this);
        return this;
    }
    static get is() {
        return this.localName || `${this.name.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`).substr(1)}`;
    }
    static get animations() {
        return {};
    }
}
//# sourceMappingURL=component.js.map