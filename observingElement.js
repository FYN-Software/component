import Base from './base.js';
import Loop from './loop.js';
import { abstract } from './mixins.js';
import { objectFromEntries } from './extends.js';

const specialProperties = [ 'if', 'for' ];
const regex = /{{\s*(.+?)\s*}}/gs;
const decodeHtml = (html) => {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
};

// TODO(Chris Kruining)
//  Offload this to separate thread
//  Using a web worker (most likely
//  Add a wrapper class so the API
//  Will be similar to C# task API)
let elements = new Set();
setInterval(() =>
{
    for(const el of elements)
    {
        if(el._queue.length > 0 || el._setQueue.length > 0)
        {
            el._render();
        }
    }
}, 100);

export default abstract(class ObservingElement extends Base
{
    constructor()
    {
        if(new.target.prototype.attributeChangedCallback !== ObservingElement.prototype.attributeChangedCallback)
        {
            throw new Error('method attributeChangedCallback is final and should therefor not be extended');
        }

        super();

        this._bindings = null;
        this._queue = [];
        this._setQueue = [];
        this._observers = {};
        this._properties = this.constructor.properties;
        this.__initialized = false;

        Object.entries(this.constructor.properties).forEach(([k, v]) => {
            Reflect.defineProperty(this, k, {
                get: () => this.__get(k),
                set: v => this.__set(k, v),
                enumerable: true,
            });

            const attr = k.toDashCase();
            this.__set(k, this.getAttribute(attr) || this.hasAttribute(attr) || v);
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

            this._observers[p] = c;
        }
    }

    _render()
    {
        if(this.__initialized === true && this._bindings !== null && this._setQueue.length > 0)
        {
            const q = this._setQueue;
            this._setQueue = [];

            for(let args of q)
            {
                this.__set(...args);
            }

            this.emit('setQueueCleared');
        }

        let node;

        while((node = this._queue.shift()) !== undefined)
        {
            const n = node;
            const v = n.bindings.length === 1 && n.bindings[0].original === n.template
                ? n.bindings[0].value
                : Promise.all(n.bindings.map(b => b.value.then(v => [
                    b.expression,
                    v
                ])))
                    .then(objectFromEntries)
                    .then(v => n.template.replace(regex, (a, m) => v[m]));

            v.then(v => {
                if(n.nodeType === 2 && specialProperties.includes(n.nodeName))
                {
                    switch(n.nodeName)
                    {
                        case 'if':
                            n.ownerElement.attributes.setOnAssert(v !== true, 'hidden');

                            break;

                        case 'for':
                            const loop = n.ownerElement.loop;
                            loop.data = v;
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
            });
        }
    }

    __get(name)
    {
        let m = this._observers.hasOwnProperty(name) && this._observers[name].hasOwnProperty('get')
            ? this._observers[name].get
            : v => v;

        return m(this._properties[name]);
    }

    __set(name, value)
    {
        if(typeof value === 'string' && value.match(/^{{\s*.+\s*}}$/g) !== null)
        {
            return;
        }

        if(value instanceof Promise)
        {
            return value.then(v => this.__set(name, v));
        }

        if(this.__initialized === false || this._bindings === null)
        {
            this._setQueue.push([ name, value ]);

            return;
        }

        const m = this._observers.hasOwnProperty(name) && this._observers[name].hasOwnProperty('set')
            ? this._observers[name].set
            : v => v;

        value = m(value);
        const old = this._properties[name];

        if(old === value)
        {
            return;
        }

        this._properties[name] = value;

        if(this._observers.hasOwnProperty(name) && this._observers[name].hasOwnProperty('changed'))
        {
            this._observers[name].changed(old, value);
        }

        const bindings = this._bindings
            .filter(b => b.properties.includes(name));
        const nodes = bindings.map(b => b.nodes).reduce((t, n) => [ ...t, ...n ], [])
            .unique();

        bindings.forEach(b => b.resolve(this));
        this._queue.push(...nodes);
    }

    _parseHtml(html)
    {
        let nodes = [];
        const regex = /{{\s*(.+?)\s*}}/g;
        const iterator = node => {
            switch(node.nodeType)
            {
                case 1:
                    Array.from(node.attributes).forEach(a => iterator(a));

                    if(Array.from(node.attributes).some(a => a.name === 'for'))
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

                if(bindings.has(match[1]) === false)
                {
                    let variable = match[1];

                    if(node.nodeType === 2 && node.localName === 'for')
                    {
                        let name;

                        [ name, variable ] = variable.split(/ in /);

                        new Loop(node.ownerElement, name, this);
                    }

                    const self = this;
                    const keys = Object.keys(this.constructor.properties);
                    const callable = Function(`
                        'use strict'; 
                        return function(${keys.join(', ')})
                        { 
                            try
                            { 
                                return ${variable}; 
                            }
                            catch(e)
                            {
                                return undefined; 
                            } 
                        };
                    `)();

                    binding = {
                        original: match[0],
                        expression: match[1],
                        properties: keys.filter(k => variable.includes(k)),
                        nodes: new Set(),
                        value: Promise.resolve(callable.apply(this, Object.values(self._properties))),
                        resolve()
                        {
                            let t = self;

                            while(t._properties.hasOwnProperty('__this__') === true)
                            {
                                t = t._properties.__this__;
                            }

                            this.value = Promise.resolve(callable.apply(t, Object.values(self._properties)));
                        },
                    };
                    bindings.set(match[1], binding);
                }
                else
                {
                    binding = bindings.get(match[1])
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
        const nodes = this._bindings.map(b => b.nodes).reduce((t, n) => [ ...t, ...n ], [])
            .unique();

        this._queue.push(...nodes);
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
                if(this.__initialized !== true)
                {
                    return;
                }

                this.__set(
                    name.toCamelCase(),
                    newValue,
                    Array.from(this.attributes).find(a => a.nodeName === name),
                    false
                );

                break;
        }
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
