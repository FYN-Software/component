import Base from './base.js';
import Loop from './loop.js';
import { abstract } from './mixins.js';

const specialProperties = [ 'if', 'for' ];

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

        this._bindings = [];
        this._queue = [];
        this._setQueue = [];
        this._observers = {};
        this._properties = this.constructor.properties;
        this.__initialized = false;

        const observer = new MutationObserver(r =>
        {
            for(let record of r)
            {
                switch(record.type)
                {
                    // NOTE(Chris Kruining)
                    // This block is to counter the browsers
                    // Logic to remove the text node, I do
                    // This for persistency(bindings) reasons
                    case 'childList':
                        let nodes = Array.from(record.removedNodes)
                            .filter(n => n.nodeType === 3 && n.hasOwnProperty('template'));

                        for(let node of nodes)
                        {
                            record.target.appendChild(node);
                        }

                        const existing = Array.from(record.target.childNodes)
                            .find(c => c.hasOwnProperty('template'));

                        if(existing !== undefined)
                        {
                            let nodes = Array.from(record.addedNodes)
                                .filter(n => n.nodeType === 3 && n.hasOwnProperty('template') !== true);

                            for(let node of nodes)
                            {
                                existing.textContent = node.textContent;

                                node.remove();

                                if(record.target.focused === true)
                                {
                                    let range = document.createRange();
                                    range.setStart(record.target.childNodes[0], 1);
                                    range.collapse(true);

                                    let selection = window.getSelection();
                                    selection.removeAllRanges();
                                    selection.addRange(range);
                                }

                                break;
                            }
                        }

                        break;

                    case 'characterData':
                        let bindings = this._bindings.filter(
                            b => b.nodes.includes(record.target) && b.properties.length === 1
                        );

                        for(let binding of bindings)
                        {
                            this.__set(binding.expression, record.target.textContent, record.target, false);
                        }

                        break;
                }
            }
        });
        observer.observe(this.shadow, {
            attributes: true,
            attributeOldValue: true,
            childList: true,
            subtree: true,
            characterData: true,
            characterDataOldValue: true,
        });
    }

    observe(config)
    {
        for(let [ p, c ] of Object.entries(config))
        {
            if(Object.keys(this.constructor.properties).includes(p) !== true)
            {
                throw new Error(`Trying to observe non-observable property ${p}`);
            }

            this._observers[p] = c;
        }
    }

    _render()
    {
        if(this.__initialized === true && this._setQueue.length > 0)
        {
            const q = this._setQueue;
            this._setQueue = [];

            for(let args of q)
            {
                this.__set(...args);
            }
        }

        let node;

        while((node = this._queue.shift()) !== undefined)
        {
            let values = this._bindings.filter(b => b.nodes.includes(node));
            let v = values.length === 1 && values[0].original === node.template
                ? values[0].value
                : node.template.replace(
                    /{{\s*(.+?)\s*}}/g,
                    (a, m) => this._bindings.find(b => b.expression === m).value
                );

            if(node.nodeType === 2 && specialProperties.includes(node.nodeName))
            {
                switch(node.nodeName)
                {
                    case 'if':
                        node.ownerElement.attributes.setOnAssert(v !== true, 'hidden');

                        break;

                    case 'for':
                        // TODO(Chris Kruining) Re-implement loops
                        new Collection();
                        new Loop(node, []);

                        break;
                }
            }
            else if(node.nodeType === 2 && node.ownerElement.hasOwnProperty(node.nodeName))
            {
                node.ownerElement[node.nodeName] = v;
            }
            else
            {
                node.nodeValue = v;
            }
        }
    }

    __get(name)
    {
        let m = this._observers.hasOwnProperty(name) && this._observers[name].hasOwnProperty('get')
            ? this._observers[name].get
            : v => v;

        return m(this._properties[name]);
    }

    __set(name, value, source = null, force = false)
    {
        if(typeof value === 'string' && value.match(/^{{\s*.+\s*}}$/g) !== null)
        {
            return;
        }

        if(this.__initialized === false && (typeof value !== 'string' || value.match(/{{\s*.+\s*}}/g) === null))
        {
            this._setQueue.push([ name, value, source, force ]);

            return;
        }

        let m = this._observers.hasOwnProperty(name) && this._observers[name].hasOwnProperty('set')
            ? this._observers[name].set
            : v => v;

        value = m(value);
        const old = this._properties[name];

        if(old === value && force === false)
        {
            return;
        }

        this._properties[name] = value;

        if(this._observers.hasOwnProperty(name) && this._observers[name].hasOwnProperty('changed'))
        {
            this._observers[name].changed(old, value);
        }

        let bindings = this._bindings.filter(b => b.properties.includes(name) && b.nodes.includes(source) !== true);


        let nodes = bindings.map(b => b.nodes).reduce((t, n) => [ ...t, ...n ], [])
            .unique();

        bindings.forEach(b => b.resolve());
        this._queue.push(...nodes);
    }

    _parseHtml(html)
    {
        Object.entries(this.constructor.properties).forEach(([ k ]) =>
        {
            Reflect.defineProperty(this, k, {
                get: () => this.__get(k),
                set: v => this.__set(k, v),
                enumerable: true,
            });
        });

        let nodes = [];
        const regex = /{{\s*(.+?)\s*}}/g;
        const iterator = node =>
        {
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

        for(let node of nodes)
        {
            let str = node.nodeValue;
            let match;

            Object.defineProperty(node, 'template', { value: str });

            while((match = regex.exec(str)) !== null)
            {
                let binding = this._bindings.find(b => b.expression === match[1]);

                if(binding === undefined)
                {
                    const self = this;
                    const keys = Object.keys(this._properties).join(', ');
                    const callable = Function(
                        `'use strict'; try { return (${keys}) => ${match[1]}; } catch(e){ return undefined; }`
                    )();

                    binding = {
                        original: match[0],
                        expression: match[1],
                        nodes: new Set(),
                        value: callable(...Object.values(self._properties)),
                        resolve()
                        {
                            this.value = callable(...Object.values(self._properties));
                        },
                    };

                    this._bindings.push(binding);
                }

                binding.nodes.add(node);
            }
        }

        return html;
    }

    _populate()
    {
        Object.entries(this.constructor.properties).forEach(([ k, v ]) =>
        {
            const attr = k.toDashCase();

            this.__set(
                k,
                this.getAttribute(attr) || this.hasAttribute(attr) || v,
                Array.from(this.attributes).find(a => a.nodeName === attr),
                true
            );
        });
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
