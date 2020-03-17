import Binding, { AsyncFunction } from './binding.js';
import Directive from './directive/directive.js';
import Type from '../data/type/type.js';
import Event from '../core/event.js';
import Queue from '../core/queue.js';

// Declare private class properties
const get = Symbol('get');
const set = Symbol('set');
const render = Symbol('render');
const properties = Symbol('properties');

window.range = (s, e) => Array(e - s).fill(1).map((_, i) => s + i);

export const regex = /{{\s*(?<variable>.+?)\s*}}/g;

export default class Base extends HTMLElement
{
    _bindings = null;
    #shadow = this.attachShadow({ mode: 'closed' });
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
                    await this.constructor.render(n);
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
            await this.constructor.render(n);
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
        if(value instanceof Type)
        {
            throw new Error('Expected a value, not a type');
        }

        if(value instanceof Promise)
        {
            value = await value;
        }

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
            throw new class Exception
            {
                constructor(message, inner, owner)
                {
                    this.message = message;
                    this.inner = inner;
                    this.owner = owner;
                }
            }(`Failed to set '${this.constructor.name}.${name}', '${value}' is not valid`, e, this);
        }
    }

    static async parseHtml(owner, scope, html, allowedKeys = null)
    {
        allowedKeys = allowedKeys || Object.keys(this[properties]);

        const iterator = function*(node)
        {
            switch(node.nodeType)
            {
                case 1:
                    // TODO(Chris Kruining) Fix this nasty hack.
                    //  Maybe I could add a directive for template injection into slots?
                    if(node.hasAttribute('template'))
                    {
                        node.removeAttribute('template');

                        return;
                    }

                    for(const a of node.attributes)
                    {
                        yield* iterator(a);
                    }

                case 11:
                    for(const c of node.childNodes)
                    {
                        yield* iterator(c);
                    }

                    break;

                case 2:
                case 3:
                    let m = node.nodeValue.match(regex);

                    if(m !== null)
                    {
                        node.matches = m;
                        yield node;
                    }

                    break;
            }
        };

        const bindings = new Map();

        for(const node of iterator(html))
        {
            // TODO(Chris Kruining) Figure out why the hell this is needed...
            if(node.hasOwnProperty('bindings'))
            {
                console.warn('duplicate node iteration is still an issue!');

                continue;
            }

            const str = node.nodeValue;
            const nodeBindings = new Set();

            for(const [ original, variable ] of Array.from(str.matchAll(regex), m => [ m[0], m.groups.variable ]))
            {
                let binding;

                if(bindings.has(variable) === false)
                {
                    const keys = allowedKeys.filter(k => variable.includes(k)).unique();
                    let callable;

                    try
                    {
                        callable = new AsyncFunction(
                            ...keys,
                            `try { return await ${variable}; } catch { return undefined; }`
                        );
                    }
                    catch (e)
                    {
                        callable = new AsyncFunction('return undefined;');
                    }

                    binding = new Binding(original, variable, keys, callable);
                    binding.resolve(scope, owner);
                    bindings.set(variable, binding);
                }
                else
                {
                    binding = bindings.get(variable)
                }

                // NOTE(Chris Kruining)
                // To make sure structures like for
                // directives can update on a 'imported'
                // variable register a change listener
                const props = Object.keys(owner.#properties);
                for(const [, prop ] of variable.matchAll(/this\.([a-zA-Z_][a-zA-Z0-9_]*)/g))
                {
                    if(props.includes(prop) === false)
                    {
                        continue;
                    }

                    owner.observe({
                        [prop]: async (o, n) => {
                            // console.log(o, n, node, binding, scope, owner);

                            await binding.resolve(scope, owner);
                            Base.render(node);
                        },
                    });
                }

                // NOTE(Chris Kruining)
                // Detect and create directives
                if(node.nodeType === 2 && node.localName.startsWith(':'))
                {
                    const directive = await Directive.get(node.localName.substr(1));

                    if(node.ownerElement.hasOwnProperty('__directives__') === false)
                    {
                        Object.defineProperty(node.ownerElement, '__directives__', {
                            value: {},
                            enumerable: false,
                            writable: false,
                        });
                    }

                    node.ownerElement.__directives__[node.localName] = new directive(owner, scope, node.ownerElement, binding);
                }

                nodeBindings.add(binding);
                binding.nodes.add(node);
            }

            Object.defineProperty(node, 'template', { value: str });
            Object.defineProperty(node, 'bindings', { value: Array.from(nodeBindings) });
        }

        return { html, bindings: Array.from(bindings.values()) };
    }

    async _populate()
    {
        const keys = Object.keys(this.#properties);

        for(const key of keys)
        {
            this.#properties[key].emit('changed', { old: undefined, new: this.#properties[key].value });
        }

        for(const args of this.#setQueue)
        {
            try
            {
                await this[set](...args);
            }
            catch(e)
            {
                const [ key, value ] = args;

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

    static async render(n)
    {
        const v = await (n.bindings.length === 1 && n.bindings[0].original === n.template
            ? n.bindings[0].value
            : Promise.all(n.bindings.map(b => b.value.then(v => [ b.expression, v ])))
                .then(Object.fromEntries)
                .then(v => n.template.replace(regex, (a, m) => {
                    const value = v[m];

                    return value;
                }))
        );

        if(
            n.nodeType === 2
            && n.localName.startsWith(':')
            && n.ownerElement.hasOwnProperty('__directives__') &&
            n.ownerElement.__directives__.hasOwnProperty(n.localName)
        ) {
            await n.ownerElement.__directives__[n.localName].render();
        }
        else if(n.nodeType === 2 && n.ownerElement.hasOwnProperty(n.localName.toCamelCase()))
        {
            n.ownerElement[n.localName.toCamelCase()] = v;
        }
        else
        {
            try
            {
                n.nodeValue = v;
            }
            catch(e)
            {
                console.trace(this, v);

                throw e;
            }
        }
    }
};
