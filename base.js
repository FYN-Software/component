import { equals, objectFromEntries } from '../core/extends.js';
import { abstract } from '../core/mixins.js';
import Type from '../data/type/type.js';
import Loop from './loop.js';
import Queue from './utilities/queue.js';

const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

// Declare private class properties
const get = Symbol('get');
const set = Symbol('set');
const queue = Symbol('queue');
const render = Symbol('render');
const shadow = Symbol('shadow');
const setQueue = Symbol('setQueue');
const observers = Symbol('observers');
const properties = Symbol('properties');

const decodeHtml = (html) => {
    const txt = document.createElement("textarea");
    txt.innerHTML = String(html);
    return txt.value;
};
const specialProperties = [ 'if', 'for' ];
const regex = /{{(?:#(?<label>[a-z]+))?\s*(?<variable>.+?)\s*}}/g;
const elements = new Set();
setInterval(() => {
    for(const el of elements)
    {
        el[render]();
    }
}, 100);

export default abstract(class Base extends HTMLElement
{
    constructor()
    {
        if(new.target.prototype.attributeChangedCallback !== Base.prototype.attributeChangedCallback)
        {
            throw new Error('method attributeChangedCallback is final and should therefor not be extended');
        }

        super();

        this[shadow] = this.attachShadow({ mode: 'open' });

        this._bindings = null;
        this[queue] = new Queue;
        this[setQueue] = [];
        this[observers] = {};
        this[properties] = this.constructor.properties;

        Object.entries(this[properties]).forEach(([k, v]) => {
            Reflect.defineProperty(this, k, {
                get: () => this[get](k),
                set: async v => await this[set](k, v),
                enumerable: true,
            });

            const attr = k.toDashCase();
            this[set](k, this.getAttribute(attr) || this.hasAttribute(attr) || v);
        });
    }

    observe(config)
    {
        for(let [ p, c ] of Object.entries(config))
        {
            if(Object.keys(this.constructor.properties).includes(p) !== true)
            {
                throw new Error(`Trying to observe non-observable property '${p}'`);
            }

            if(this[properties][p] instanceof Type)
            {
                this[properties][p].on({
                    changed: e => c.apply(this[properties][p], [ e.detail.old, e.detail.new ]),
                });
            }
            else
            {
                this[observers][p] = c;
            }
        }
    }

    async [render]()
    {
        for await(const n of this[queue])
        {
            const v = await (
                n.bindings.length === 1 && n.bindings[0].original === n.template
                    ? n.bindings[0].value
                    : Promise.all(n.bindings.map(b => b.value.then(v => [ b.expression, v ])))
                        .then(objectFromEntries)
                        .then(v => n.template.replace(regex, (a, l, m) => {
                            const value = v[m];

                            if(value instanceof Type)
                            {
                                return value[Symbol.toPrimitive](l || 'default')
                            }

                            // console.error(value);

                            return value;
                        }))
            );

            if(n.nodeType === 2 && specialProperties.includes(n.nodeName))
            {
                switch(n.nodeName)
                {
                    case 'if':
                        n.ownerElement.attributes.setOnAssert(v !== true, 'hidden');

                        break;

                    case 'for':
                        const loop = n.ownerElement.loop;
                        loop.data = v || [];
                        loop.render();

                        break;
                }
            }
            else if(n.nodeType === 2 && n.ownerElement.hasOwnProperty(n.nodeName))
            {
                n.ownerElement[n.nodeName] = v;
            }
            else
            {
                n.nodeValue = decodeHtml(v);
            }
        }
    }

    [get](name)
    {
        if(this[properties].hasOwnProperty(name) === false)
        {
            throw new Error(`Property '${this.constructor.name}.${name}' does not extist`)
        }

        if(this[properties][name] instanceof Type)
        {
            return this[properties][name].__value;
        }

        return this[properties][name];
    }

    async [set](name, value)
    {
        if(typeof value === 'string' && value.match(/^{{\s*.+\s*}}$/g) !== null)
        {
            return;
        }

        if(value instanceof Promise)
        {
            value = await value;
        }

        if(value instanceof  Type)
        {
            value = value.__value;
        }

        if(this._bindings === null)
        {
            this[setQueue].push([ name, value ]);

            return;
        }

        const old = this[properties][name];

        if(old === value || equals(old, value))
        {
            return;
        }

        try
        {
            if(this[properties][name] instanceof Type)
            {
                this[properties][name].__value = value;
            }
            else
            {
                this[properties][name] = value;
            }
        }
        catch(e)
        {
            throw new Error(
                `Failed to set '${this.constructor.name}.${name}', '${value}' is not valid`
            );
        }

        const bindings = this._bindings.filter(b => b.properties.includes(name));

        await Promise.all(bindings.map(b => b.resolve(this)));

        this[queue].enqueue(...bindings.map(b => b.nodes).reduce((t, n) => [ ...t, ...n ], []).unique());
    }

    _parseHtml(html)
    {
        let nodes = [];
        const iterator = node => {
            switch(node.nodeType)
            {
                case 1:
                    if(Array.from(node.attributes).some(a => [ 'template' ].includes(a.name)))
                    {
                        return;
                    }

                    Array.from(node.attributes).forEach(a => iterator(a));

                    if(Array.from(node.attributes).some(a => [ 'for' ].includes(a.name)))
                    {
                        return;
                    }

                case 11:
                    Array.from(node.childNodes).forEach(a => iterator(a));

                    return;

                case 2:
                case 3:
                    let m = node.nodeValue.match(regex);

                    if(m !== null)
                    {
                        node.matches = m;
                        nodes.push(node);
                    }

                    return;
            }
        };

        iterator(html);

        const bindings = new Map();

        for(let node of nodes)
        {
            let str = node.nodeValue;
            let match;

            const nodeBindings = new Set();

            while((match = regex.exec(str)) !== null)
            {
                let binding;
                let { label, variable } = match.groups;

                if(bindings.has(variable) === false)
                {
                    if(node.nodeType === 2 && node.localName === 'for')
                    {
                        let name;

                        [ name, variable ] = variable.split(/ in /);

                        new Loop(node.ownerElement, name, this);
                    }

                    const self = this;
                    const keys = Object.keys(this.constructor.properties);
                    const callable = new AsyncFunction(...keys, `
                        try
                        {
                            return ${variable}; 
                        }
                        catch(e)
                        {
                            return undefined; 
                        }
                    `);

                    binding = {
                        original: match[0],
                        expression: variable,
                        label: label || 'default',
                        properties: keys.filter(k => variable.includes(k)),
                        nodes: new Set(),
                        value: callable.apply(this, Object.values(self[properties])),
                        async resolve()
                        {
                            let t = self;

                            try
                            {
                                while(t[properties].hasOwnProperty('__this__') === true)
                                {
                                    t = t[properties].__this__;
                                }
                            }
                            catch
                            {
                                t = null;
                            }

                            this.value = callable.apply(t, Object.values(self[properties]).map(p => p instanceof Type ? p.__value : p));

                            return this.value;
                        },
                    };

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
        this[queue].enqueue(...this._bindings.map(b => b.nodes).reduce((t, n) => [ ...t, ...n ], []).unique());

        for(let args of this[setQueue])
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

    adoptedCallback()
    {
        elements.add(this);
    }

    disconnectedCallback()
    {
        elements.delete(this);
    }

    attributeChangedCallback(name, oldValue, newValue)
    {
        switch(name)
        {
            case 'if':
            case 'for':
                // Console.log(name, oldValue, newValue);
                break;

            default:
                if(this._bindings === null)
                {
                    return;
                }

                this[set](
                    name.toCamelCase(),
                    newValue,
                    Array.from(this.attributes).find(a => a.nodeName === name),
                    false
                );

                break;
        }
    }

    get shadow()
    {
        return this[shadow];
    }

    static get observedAttributes()
    {
        return [ ...specialProperties, ...Object.keys(this.properties).map(p => p.toDashCase()) ];
    }

    static get properties()
    {
        return {};
    }
});
