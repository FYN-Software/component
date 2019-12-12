import { equals, objectFromEntries } from '../core/extends.js';
import { abstract } from '../core/mixins.js';
import Binding, { AsyncFunction } from './binding.js';
import Directive from './directive/directive.js';
import Type from '../data/type/type.js';
import Queue from '../core/queue.js';

// Declare private class properties
const get = Symbol('get');
const set = Symbol('set');
const render = Symbol('render');
const properties = Symbol('properties');

window.range = (s, e) => Array(e - s).fill(1).map((_, i) => s + i);

const decodeHtml = html => {
    const txt = document.createElement('textarea');
    txt.innerHTML = String(html);
    return txt.value;
};
export const regex = /{{(?:#(?<label>[a-z]+))?\s*(?<variable>.+?)\s*}}/g;

const elements = new Set();
setInterval(() => {
    for(const el of elements)
    {
        el[render]();
    }
}, 100);

export default class Base extends HTMLElement
{
    _bindings = null;
    #shadow = this.attachShadow({ mode: 'open' });
    #queue = new Queue;
    #setQueue = [];
    #observers = {};
    #properties = {};

    constructor()
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

        Object.entries(this.#properties).forEach(([k, v]) => {
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

            this[set](k, (this.getAttribute(attr) && this.getAttribute(attr).match(/^{{\s*.+\s*}}$/g) ? null : this.getAttribute(attr)) || this.hasAttribute(attr) || v.value);
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
            this.#setQueue.push([ name, value ]);

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

    static async parseHtml(scope, html, allowedKeys = null)
    {
        allowedKeys = allowedKeys || Object.keys(this[properties]);

        const iterator = function*(node)
        {
            switch(node.nodeType)
            {
                case 1:
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
                continue;
            }

            const str = node.nodeValue;
            const nodeBindings = new Set();

            for(const [ original, label, variable ] of Array.from(str.matchAll(regex), m => [ m[0], m.groups.label, m.groups.variable ]))
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
                            `try { return ${variable}; } catch { return undefined; }`
                        );
                    }
                    catch (e)
                    {
                        callable = new AsyncFunction('return undefined;');
                    }

                    binding = new Binding(original, variable, label || 'defualt', keys, callable);

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

                        node.ownerElement.__directives__[node.localName] = new directive(scope, node.ownerElement, binding);
                    }

                    binding.resolve(scope);

                    bindings.set(variable, binding);
                }
                else
                {
                    binding = bindings.get(variable)
                }

                nodeBindings.add(binding);
                binding.nodes.add(node);
            }

            Object.defineProperty(node, 'template', { value: str });
            Object.defineProperty(node, 'bindings', { value: Array.from(nodeBindings) });
        }

        return { html, bindings: Array.from(bindings.values()) };
    }

    _populate()
    {
        for(const key of Object.keys(this.#properties))
        {
            this.#properties[key].emit('changed', { old: undefined, new: this.#properties[key].value });
        }

        const setQueue = Object.entries(this.#setQueue.reduce((t, [k, v]) => {
            t[k] = v;

            return t;
        }, {}));

        for(const args of setQueue)
        {
            try
            {
                this[set](...args);
            }
            catch(e)
            {
                const [ key, value ] = args;

                throw new Error(`Failed to set '${key}', '${value}' is not a valid value`);
            }
        }
    }

    connectedCallback()
    {
        elements.add(this);
    }

    disconnectedCallback()
    {
        elements.delete(this);

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
                .then(objectFromEntries)
                .then(v => n.template.replace(regex, (a, l, m) => {
                    const value = v[m];

                    if(value instanceof Type)
                    {
                        return value[Symbol.toPrimitive](l || 'default')
                    }

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
        else if(n.nodeType === 2 && n.ownerElement.hasOwnProperty(n.nodeName))
        {
            n.ownerElement[n.nodeName] = v;
        }
        else
        {
            try
            {
                n.nodeValue = v;
            }
            catch
            {
                n.nodeValue = decodeHtml(v);
            }
        }
    }
};
