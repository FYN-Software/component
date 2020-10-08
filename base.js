import Exception from './exception.js';
import Type from '../data/type/type.js';
import Event from '../core/event.js';
import Queue from '../core/queue.js';
import Template, { regex } from './template.js';

// Declare private class properties
const get = Symbol('get');
const set = Symbol('set');
const render = Symbol('render');
const properties = Symbol('properties');

window.range = (s, e) => Array(e - s).fill(1).map((_, i) => s + i);

// TODO(Chris Kruining)
//  this export is for legacy,
//  update usages and remove this export!
export { regex } from './template.js';

export default class Base extends HTMLElement
{
    _bindings = null;
    #internals = this.attachInternals();
    #shadow;
    #queue = new Queue;
    #setQueue = new Queue;
    #observers = {};
    #properties = {};

    constructor(args = {})
    {
        if(new.target === Base.constructor)
        {
            throw new Error(`'${new.target.name}' is abstract, needs an concrete implementation to function properly`);
        }

        if(new.target.prototype.attributeChangedCallback !== Base.prototype.attributeChangedCallback)
        {
            throw new Error('method attributeChangedCallback is final and should therefor not be extended');
        }

        super();

        this.#shadow = this.#internals.shadowRoot ?? this.attachShadow({ mode: 'closed' });
        this.#properties = this.constructor[properties];

        for(let [k, v] of Object.entries(this.#properties))
        {
            if((v instanceof Type) === false && (v.prototype instanceof Type) === false)
            {
                throw new Error(`Expected a ${Type.name}, got '${v}' instead`);
            }

            if(v.prototype instanceof Type)
            {
                this.#properties[k] = v = new v();
            }

            v._owner = this;
            v._name = k;
            v.on({
                changed: async () => {
                    const bindings = this._bindings.filter(b => b.keys.includes(k));

                    await Promise.all(bindings.map(b => b.resolve(this)));

                    this.#queue.enqueue(...bindings.map(b => b.nodes).reduce((t, n) => [ ...t, ...n ], []).unique());
                },
            });

            Reflect.defineProperty(this, k, {
                get: () => v.value,
                set: async v => await this[set](k, v),
                enumerable: true,
                configurable: false,
            });

            const attr = k.toDashCase();
            const value = (this.getAttribute(attr) && this.getAttribute(attr).match(/^{{\s*.+\s*}}$/) !== null ? null : this.getAttribute(attr)) || (this.hasAttribute(attr) && this.getAttribute(attr) === '') || v.value;

            this[set](k, args.hasOwnProperty(k) ? args[k] : value);
        }

        this.#queue.on({
            enqueued: Event.debounce(5, async () => {
                for await(const n of this.#queue)
                {
                    await Template.render(n);
                }
            }),
        });

        this.#properties = Object.freeze(this.#properties);
    }

    destructor()
    {
        elements.delete(this);

        this._bindings = null;
        this.#shadow = null;
        this.#queue = null;
        this.#setQueue = null;
        this.#observers = null;
        this.#properties = null;
    }

    observe(config)
    {
        for(const [ p, c ] of Object.entries(config))
        {
            if(Object.keys(this.#properties).includes(p) !== true || (this.#properties[p] instanceof Type) === false)
            {
                throw new Error(`Trying to observe non-observable property '${p}'`);
            }

            this.#properties[p].on({ changed: e => c.apply(this.#properties[p], [ e.old, e.new ]) });
        }

        return this;
    }

    modify(config)
    {
        for(const [ p, { get = null, set = null } ] of Object.entries(config))
        {
            if(Object.keys(this.#properties).includes(p) !== true || (this.#properties[p] instanceof Type) === false)
            {
                throw new Error(`Trying to modify invalid property '${p}'`);
            }

            if(get !== null)
            {
                this.#properties[p].getter = get;
            }

            if(set !== null)
            {
                this.#properties[p].setter = set;
            }
        }

        return this;
    }

    async [render]()
    {
        for await(const n of this.#queue)
        {
            await Template.render(n);
        }
    }

    [get](name)
    {
        if(this.#properties.hasOwnProperty(name) === false)
        {
            throw new Error(`Property '${this.constructor.name}.${name}' does not exist`)
        }

        if((this.#properties[name] instanceof Type) === false)
        {
            throw new Error(`Property '${this.constructor.name}.${name}' is not of a managed type and therefor invalid`)
        }

        return this.#properties[name].value;
    }

    async [set](name, value)
    {
        if(this._bindings === null)
        {
            this.#setQueue.enqueue([ name, value ]);

            return;
        }

        try
        {
            await this.#properties[name].setValue(value);
        }
        catch(e)
        {
            throw new Exception(`Failed to set '${this.constructor.name}.${name}', '${value}' is not valid`, e, this);
        }
    }

    static parseHtml(owner, scope, html, allowedKeys = null)
    {
        return Template.parseHtml(owner, scope, html, owner.#properties, allowedKeys ?? Object.keys(this[properties]))
    }

    async _populate()
    {
        const keys = Object.keys(this.#properties);

        for(const key of keys)
        {
            this.#properties[key].emit('changed', { old: undefined, new: this.#properties[key].value });
        }

        for(const [ key, value ] of this.#setQueue)
        {
            try
            {
                await this[set](key, value);
            }
            catch(e)
            {

                throw new Error(`Failed to set '${key}', '${value}' is not a valid value`);
            }
        }

        this.#queue.enqueue(...this._bindings.filter(b => b.keys.some(k => keys.includes(k)) === false).map(b => b.nodes).reduce((t, n) => [ ...t, ...n ], []).unique());
    }

    connectedCallback()
    {
        // elements.add(this);
    }

    disconnectedCallback()
    {
        // elements.delete(this);

        // this.destructor();
    }

    attributeChangedCallback(name, oldValue, newValue)
    {
        if(this._bindings === null)
        {
            return;
        }

        this[set](name.toCamelCase(), newValue);
    }

    get internals()
    {
        return this.#internals;
    }

    get shadow()
    {
        return this.#shadow;
    }

    get properties()
    {
        return this.#properties;
    }

    static get observedAttributes()
    {
        return Object.keys(this[properties]).map(p => p.toDashCase());
    }

    static get properties()
    {
        return {};
    }

    static get [properties]()
    {
        let constructor = this;
        let props = {};

        while(constructor !== Base)
        {
            props = Object.assign(constructor.properties, props);
            constructor = constructor.__proto__;
        }

        return props;
    }
};

function uuid()
{
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
}
