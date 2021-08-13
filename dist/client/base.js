import { equals } from '@fyn-software/core/extends.js';
import Event from '@fyn-software/core/event.js';
import Queue from '@fyn-software/core/queue.js';
import Template, { uuidRegex } from './template.js';
import Exception from '@fyn-software/core/exception.js';
const properties = new WeakMap;
export class Model extends EventTarget {
    constructor(owner, properties, args = {}) {
        super();
        for (const [key, propertyConfig] of Array.from(properties.entries())) {
            const k = key;
            const value = new ValueContainer(owner, args[k], propertyConfig);
            value.on({
                changed: details => this.emit('changed', { property: k, ...details }),
            });
            Object.defineProperty(this, key, {
                value,
                writable: false,
                enumerable: true,
                configurable: false,
            });
        }
    }
}
class ValueContainer extends EventTarget {
    _value;
    _owner;
    _config;
    constructor(owner, value, config) {
        super();
        this._value = value;
        this._owner = owner;
        this._config = config;
    }
    get value() {
        return this._value;
    }
    async setValue(value) {
        const old = this._value;
        const setter = this._config.set ?? (v => v);
        this._value = setter.call(this._owner, value);
        if (equals(old, this._value) === false) {
            this.emit('changed', { old, new: this._value });
        }
    }
}
export default class Base extends HTMLElement {
    static _observers = new WeakMap();
    _bindings;
    _internals = this.attachInternals();
    _shadow;
    _queue = new Queue;
    _setQueue = new Map;
    _properties;
    _viewModel;
    _initialized = false;
    events = {};
    constructor(args = {}) {
        super();
        this._shadow = this._internals.shadowRoot ?? this.attachShadow({ mode: 'closed', delegatesFocus: false });
        let rule;
        try {
            rule = this._shadow.styleSheets[0].cssRules[0];
        }
        catch {
            const sheet = new CSSStyleSheet();
            sheet.addRule(':host');
            rule = sheet.cssRules[0];
        }
        Object.defineProperties(this._shadow, {
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
        });
        this._properties = Base.getPropertiesOf(this.constructor);
        this._viewModel = new Model(this, this._properties, args);
        this._viewModel.on({
            changed: async ({ property, old: o, new: n }) => {
                for (const c of Base._observers.get(this)?.get(property) ?? []) {
                    c.apply(this._viewModel[property].value, [o, n]);
                }
                const bindings = this._bindings?.filter(b => b.keys.includes(property)) ?? [];
                await Promise.all(bindings.map(b => b.resolve([this])));
                const mapper = this._properties.get(property)?.bindToCSS;
                if (mapper !== undefined) {
                    this.shadow.setProperty(`--${property}`, mapper(n));
                }
                const nodes = bindings.map(b => b.nodes)
                    .reduce((t, n) => [...t, ...n], [])
                    .unique();
                this._queue.enqueue(...nodes);
            },
        });
        this._queue.on({
            enqueued: Event.debounce(10, async () => {
                for await (const n of this._queue) {
                    await Template.render(n);
                }
            }),
        });
    }
    async init() {
        this._initialized = true;
        for (const [k, p] of this._properties) {
            const { aliasFor } = p;
            const key = (aliasFor ?? k);
            this._viewModel[key].setValue(this[k]);
            Object.defineProperty(this, k, {
                get() {
                    return this._viewModel[key].value;
                },
                set(value) {
                    return this._initialized ? this._set(key, value) : this._viewModel[key].setValue(value);
                },
                enumerable: true,
                configurable: false,
            });
            const v = this._viewModel[key].value;
            const attr = this.getAttribute(k.toDashCase());
            const value = (this.hasAttribute(k.toDashCase()) && attr === '' && typeof v === 'boolean')
                || ((attr?.match(uuidRegex) || attr?.includes('{{') ? null : attr) ?? v);
            void this._set(key, value);
        }
    }
    observe(config) {
        const keys = Object.keys(this._viewModel);
        for (const [p, c] of Object.entries(config)) {
            if (keys.includes(p) !== true) {
                throw new Error(`Trying to observe non-observable property '${p}'`);
            }
            if (Base._observers.has(this) === false) {
                Base._observers.set(this, new Map);
            }
            const observers = Base._observers.get(this);
            if (observers.has(p) === false) {
                observers.set(p, []);
            }
            observers.get(p).push(c);
        }
        return this;
    }
    async _set(name, value) {
        if (this._bindings === undefined) {
            this._setQueue.set(name, value);
            return;
        }
        try {
            await this._viewModel[name].setValue(value);
        }
        catch (e) {
            throw new Exception(`Failed to set '${this.constructor.name}.${name}', '${value}' is not valid`, e, this);
        }
    }
    async _populate() {
        const keys = Object.keys(this._viewModel);
        for (const key of keys) {
            this._viewModel[key].emit('changed', { old: undefined, new: this._viewModel[key].value });
        }
        for (const [key, value] of this._setQueue.entries()) {
            try {
                await this._set(key, value);
            }
            catch (e) {
                throw new Error(`Failed to populate '${key}', '${value}' is not a valid value`);
            }
        }
        this._queue.enqueue(...this._bindings
            .filter(b => b.keys.some(k => keys.includes(k)) === false)
            .map(b => b.nodes)
            .reduce((t, n) => [...t, ...n], [])
            .unique());
    }
    connectedCallback() {
    }
    disconnectedCallback() {
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (this._bindings === undefined) {
            return;
        }
        void this._set(name.toCamelCase(), newValue);
    }
    cloneNode(deep = false) {
        const res = super.cloneNode(deep);
        for (const [key, field] of Object.entries(this._viewModel)) {
            res[key] = field.value;
        }
        return res;
    }
    set bindings(bindings) {
        this._bindings = bindings;
    }
    get internals() {
        return this._internals;
    }
    get shadow() {
        return this._shadow;
    }
    get properties() {
        return this._viewModel;
    }
    static get observedAttributes() {
        return Array.from(this.getPropertiesOf(this)?.keys() ?? []);
    }
    static get properties() {
        return Array.from(this.getPropertiesOf(this)?.keys() ?? []);
    }
    static getPropertiesOf(ctor) {
        let props = [];
        while (ctor !== Base) {
            props = [...props, ...(properties.get(ctor)?.entries() ?? [])];
            ctor = Object.getPrototypeOf(ctor);
        }
        return new Map(props);
    }
    static registerProperty(target, key, options = {}) {
        if (properties.has(target) === false) {
            properties.set(target, new Map);
        }
        properties.get(target).set(key, options);
    }
}
//# sourceMappingURL=base.js.map