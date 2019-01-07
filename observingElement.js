import Base from './base.js';
import Loop from './loop.js';
import Collection from './collection.js';
import Gunslinger from './utilities/gunslinger.js';
import abstract from './mixins/abstract.js';

const parser = Gunslinger.instanciate();
const specialProperties = [ 'if', 'for' ];

// TODO(Chris Kruining)
//  Offload this to separate thread
//  Using a web worker (most likely
//  Add a wrapper class so the API
//  Will be simelar to C# task API)
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
                    case'childList':
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

                    case'characterData':
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
            let values = this._bindings.filter(b => b.nodes.includes(node)),
                v = values.length === 1 && values[0].original === node.template
                    ? values[0].value
                    : node.template.replace(
                        /{{\s*(.+?)\s*}}/g,
                        (a, m) => this._bindings.find(b => b.expression === m).value
                    );

            if(node.nodeType === 2 && specialProperties.includes(node.nodeName))
            {
                switch(node.nodeName)
                {
                    case'if':
                        node.ownerElement.attributes.setOnAssert(v !== true, 'hidden');

                        break;

                    case'for':
                        values[0].loop.render();

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

    _resolve(binding)
    {
        if(binding.hasOwnProperty('loop') && binding.loop instanceof Loop)
        {
            binding.loop.data.items = binding.methods.in.map(
                p => this._resolve({ tree: p }) || p.tokens[0].value
            )[0];

            return null;
        }

        if(binding.__expr__ === undefined)
        {
            binding.__values__ = new Set();
            const transform = s =>
            {
                if(s === undefined)
                {
                    return;
                }

                switch(s.name)
                {
                    case'root':

                    case'child':
                        return s.children.map(c => transform(c)).join('');

                    case'Range':
                        return `[${Array.from(s.children, c => transform(c) || 0).join(', ')}]`;

                    case'Loop':
                        let c = new Collection();
                        let key = null;
                        let methods = s.tokens.reduce((m, t) =>
                        {
                            switch(t.name)
                            {
                                case'loopKeyword':
                                    key = t.value;
                                    m[key] = [];

                                    break;

                                case'child':
                                    m[key].push(s.children[t.value]);

                                    break;
                            }

                            return m;
                        }, {});

                        for(let [ method, parameters ] of Object.entries(methods))
                        {
                            c[method](...parameters.map(p => this._resolve({ tree: p }) || p.tokens[0].value));
                        }

                        binding.loop = new Loop(binding.nodes[0].ownerElement, c);
                        binding.methods = methods;

                        return 'null';

                    case'Property':
                        let value = '';

                        for(let [ i, token ] of Object.entries(s.tokens))
                        {
                            i = Number.parseInt(i);

                            if(value === undefined)
                            {
                                break;
                            }

                            switch(token.name)
                            {
                                case'variable':
                                    if(i === 0)
                                    {
                                        value = `__values__['${token.value}']`;
                                        binding.__values__.add(token.value);
                                    }
                                    else
                                    {
                                        value += token.value;
                                    }

                                    break;

                                case'arrayAccess':
                                    let v = transform(s.children[token.value]);
                                    value += `[${v}]`;

                                    break;

                                case'propertyAccessor':
                                    value += '.';

                                    break;

                                case'child':
                                    value += `[${ transform(s.children[token.value]) }]`;

                                    break;

                                default:
                                    // Console.log(token.name);
                                    break;
                            }
                        }

                        return value;

                    case'Function':
                        // TODO(Chris Kruining)
                        // This is a VERY crude
                        // Implementation of the
                        // Function, this needs
                        // To be improved as this
                        // Is very error prone
                        return `${ s.children[0].tokens[0].value }(${ s.tokens.slice(1).map(t => transform(s.children[t.value]))
                            .join(', ') })`;

                    case'Scope':
                        return `(${ s.tokens.map(t => transform(s.children[t.value])).join(', ') })`;

                    case'Expression':
                        return s.tokens.map(t => t.value).join('');

                    default:
                        return '';
                }
            };

            binding.__expr__ = Function(`'use strict'; return __values__ => ${transform(binding.tree)};`)();
        }

        let res;

        try
        {
            let values = Array.from(binding.__values__).reduce((t, v) => ({ ...t, [v]: JSON.tryParse(this[v]) }), {});
            res = binding.__expr__(values);
        }
        catch(e)
        {
            res = undefined;
        }

        return res;
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

        let bindings = this._bindings.filter(b => b.properties.includes(name) && b.nodes.includes(source) !== true),
            nodes = bindings.map(b => b.nodes).reduce((t, n) => [ ...t, ...n ], [])
                .unique();

        bindings.forEach(b => b.value = this._resolve(b));
        this._queue.push(...nodes);
    }

    _parseHtml(html)
    {
        let nodes = [];

        const regex = /{{\s*(.+?)\s*}}/g,
            iterator = node =>
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
            let str = node.nodeValue,
                match;

            Object.defineProperty(node, 'template', { value: str });

            while((match = regex.exec(str)) !== null)
            {
                const iterator = s => [
                    ...s.children
                        .filter(c => c.name === 'Property' && c.tokens.length > 0)
                        .map(c => c.tokens[0].value),
                    ...s.children
                        .map(c => iterator(c))
                        .reduce((t, c) => [ ...t, ...c ], []),
                ].unique();
                let tree = parser.parse(match[1]),
                    binding = this._bindings.find(b => b.expression === match[1]);

                if(binding === undefined)
                {
                    binding = {
                        properties: iterator(tree),
                        original: match[0],
                        expression: match[1],
                        value: match[1],
                        nodes: [],
                        tree,
                    };

                    this._bindings.push(binding);
                }

                if(binding.nodes.includes(node) !== true)
                {
                    binding.nodes.push(node);
                }
            }
        }

        Object.entries(this.constructor.properties).forEach(([ k, v ]) =>
        {
            Reflect.defineProperty(this, k, {
                get: () => this.__get(k),
                set: v => this.__set(k, v),
                enumerable: true,
            });
        });

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
            case'if':

            case'for':
                // Console.log(name, oldValue, newValue);
                break;

            default:
                if(this.__initialized !== true)
                {
                    return;
                }

                this.__set(name.toCamelCase(), newValue, Array.from(this.attributes).find(a => a.nodeName === name), false);

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
