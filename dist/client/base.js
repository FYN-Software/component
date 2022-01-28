import { getPropertiesOf } from '@fyn-software/core/function/common.js';
import observe from '@fyn-software/core/observable.js';
import { debounce } from '@fyn-software/core/event.js';
import Queue from '@fyn-software/core/queue.js';
import { render, uuidRegex, plugins } from './template.js';
import { unique } from '@fyn-software/core/function/array.js';
import { toCamelCase } from '@fyn-software/core/function/string.js';
const properties = new WeakMap;
export default class Base extends HTMLElement {
    static #observers = new WeakMap();
    #internals = this.attachInternals();
    #shadow;
    #queue = new Queue;
    #properties;
    #initialArgs;
    #bindings;
    #viewModel;
    constructor(args = {}) {
        super();
        this.#initialArgs = args;
        this.#shadow = this.#internals.shadowRoot ?? this.attachShadow({ mode: 'closed', delegatesFocus: false });
        let rule;
        try {
            rule = this.#shadow.styleSheets[0].cssRules[0];
        }
        catch {
            const sheet = new CSSStyleSheet();
            sheet.addRule(':host');
            rule = sheet.cssRules[0];
        }
        Object.defineProperties(this.#shadow, {
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
        this.#properties = Base.getPropertiesOf(this.constructor);
        this.#queue.on({
            enqueued: debounce(10, async () => {
                for await (const n of this.#queue) {
                    await render(n);
                }
                this.emit('#rendered');
            }),
        });
    }
    async init() {
        const props = getPropertiesOf(this);
        for (const d of Object.values(props)) {
            if (d.get) {
                d.get = d.get.bind(this);
            }
            if (d.set) {
                d.set = d.set.bind(this);
            }
        }
        for (const attribute of this.attributes) {
            const k = toCamelCase(attribute.localName);
            if (props.hasOwnProperty(k) === false) {
                continue;
            }
            const v = (attribute.value === '' && typeof this[k] === 'boolean')
                || (attribute.value.match(uuidRegex) === null ? attribute.value : this[k]);
            if (props[k].writable) {
                props[k].value = v;
            }
            else if (props[k].set) {
                props[k].set(v);
            }
        }
        for (const [k, v] of Object.entries(this.#initialArgs)) {
            if (props.hasOwnProperty(k) === false) {
                continue;
            }
            if (props[k].writable) {
                props[k].value = v;
            }
            else if (props[k].set) {
                props[k].set(v);
            }
        }
        const model = {};
        Object.defineProperties(model, props);
        this.#viewModel = observe(model);
        this.#viewModel.on({
            changed: async ({ property, target, old: o, new: n }) => {
                if (target !== this.#viewModel) {
                    return;
                }
                for (const c of Base.#observers.get(this)?.get(property) ?? []) {
                    c.apply(this.properties[property], [o, n]);
                }
                const bindings = this.#bindings?.filter(b => b.keys.includes(property)) ?? [];
                await Promise.all(bindings.map(b => b.resolve([this], plugins)));
                const mapper = this.#properties.get(property)?.bindToCSS;
                if (mapper !== undefined) {
                    this.shadow.setProperty(`--${property}`, mapper(n));
                }
                const nodes = unique(bindings.map(b => b.nodes).reduce((t, n) => [...t, ...n], []));
                this.#queue.enqueue(...nodes);
            },
        });
        for (const k of Object.keys(this.properties)) {
            Object.defineProperty(this, k, {
                get: () => this.properties[k],
                set: value => this.properties[k] = value,
                enumerable: true,
                configurable: false,
            });
        }
    }
    observe(config) {
        for (const [p, c] of Object.entries(config)) {
            if ((p in this.properties) !== true) {
                throw new Error(`Trying to observe non-observable property '${p}'`);
            }
            if (Base.#observers.has(this) === false) {
                Base.#observers.set(this, new Map);
            }
            const observers = Base.#observers.get(this);
            if (observers.has(p) === false) {
                observers.set(p, []);
            }
            observers.get(p).push(c);
        }
        return this;
    }
    async _populate() {
        for (const key of Object.getOwnPropertyNames(this.properties)) {
            this.#viewModel.emit('changed', {
                old: undefined,
                new: this.properties[key],
                property: key,
                target: this.#viewModel
            });
        }
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (this.#bindings === undefined) {
            return;
        }
        this.properties[toCamelCase(name)] = newValue;
    }
    set bindings(bindings) {
        this.#bindings = bindings;
    }
    get internals() {
        return this.#internals;
    }
    get shadow() {
        return this.#shadow;
    }
    get properties() {
        return this.#viewModel.get();
    }
    get viewModel() {
        return this.#viewModel;
    }
    static get observedAttributes() {
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