import Exception from '@fyn-software/component/exception.js';
import Event from '@fyn-software/core/event.js';
import Queue from '@fyn-software/core/queue.js';
import { Object as ObjectType, Boolean as Bool } from '@fyn-software/data/types.js';
import Template from '@fyn-software/component/template.js';

globalThis.range = (s, e) => Array(e - s).fill(1).map((_, i) => s + i);

export default class Base extends HTMLElement
{
    #bindings = null;
    #parent = null;
    #internals = this.attachInternals();
    #shadow;
    #queue = new Queue;
    #setQueue = new Queue;
    #viewModel = {};

    // constructor(parent, args = {})
    constructor(args = {})
    {
        // if(parent === undefined)
        // {
        //     throw new Error('Invalid element construction');
        // }

        if(new.target === Base.constructor)
        {
            throw new Error(`'${new.target.name}' is abstract, needs an concrete implementation to function properly`);
        }

        if(new.target.prototype.attributeChangedCallback !== Base.prototype.attributeChangedCallback)
        {
            throw new Error('method attributeChangedCallback is final and should there for not be extended');
        }

        super();

        // this.#parent = parent;
        this.#shadow = this.#internals.shadowRoot ?? this.attachShadow({ mode: 'closed' });
        this.#viewModel = new (ObjectType.define(this.constructor.props))();

        for(const k of Object.keys(this.#viewModel))
        {
            const v = this.#viewModel.$.props[k];

            v._owner = this;
            v._name = k;
            v.on({
                changed: async () => {
                    const bindings = this.#bindings.filter(b => b.keys.includes(k));

                    await Promise.all(bindings.map(b => b.resolve(this)));

                    this.#queue.enqueue(...bindings.map(b => b.nodes).reduce((t, n) => [ ...t, ...n ], []).unique());
                },
            });

            const attr = k.toDashCase();
            const value = (this.getAttribute(attr) && (this.getAttribute(attr).startsWith('{#') || this.getAttribute(attr).includes('{{')) ? null : this.getAttribute(attr))
                || (this.hasAttribute(attr) && this.getAttribute(attr) === '' && v instanceof Bool)
                || v.$.value;

            Reflect.defineProperty(this, k, {
                get: () => v.$.value,
                set: async v => await this.#set(k, v),
                enumerable: true,
                configurable: false,
            });
            // Reflect.defineProperty(this.#parent, k, {
            //     get: () => v.$.value,
            //     set: async v => await this.#set(k, v),
            //     enumerable: true,
            //     configurable: false,
            // });

            this.#set(k, args[k] ?? value);
        }

        this.#queue.on({
            enqueued: Event.debounce(10, async () => {
                for await(const n of this.#queue)
                {
                    await Template.render(n);
                }
            }),
        });
    }

    // get children()
    // {
    //     return this.#parent.children;
    // }
    //
    // get style()
    // {
    //     return this.#parent.style;
    // }
    //
    // get attributes()
    // {
    //     return this.#parent.attributes;
    // }
    //
    // get classList()
    // {
    //     return this.#parent.classList;
    // }
    //
    // getBoundingClientRect(...args)
    // {
    //     return this.#parent.getBoundingClientRect(...args);
    // }
    //
    // hasAttribute(...args)
    // {
    //     return this.#parent.hasAttribute(...args);
    // }
    //
    // getAttribute(...args)
    // {
    //     return this.#parent.getAttribute(...args);
    // }
    //
    // setAttribute(...args)
    // {
    //     return this.#parent.setAttribute(...args);
    // }
    //
    // removeAttribute(...args)
    // {
    //     return this.#parent.removeAttribute(...args);
    // }
    //
    // on(...args)
    // {
    //     this.#parent.on(...args);
    // }
    //
    // emit(...args)
    // {
    //     this.#parent.emit(...args);
    // }

    observe(config)
    {
        for(const [ p, c ] of Object.entries(config))
        {
            if(Object.keys(this.#viewModel).includes(p) !== true)
            {
                throw new Error(`Trying to observe non-observable property '${p}'`);
            }

            this.#viewModel.$.props[p].on({ changed: e => c.apply(this.#viewModel[p], [ e.old, e.new ]) });
        }

        return this;
    }

    async #set(name, value)
    {
        if(this.#bindings === null)
        {
            this.#setQueue.enqueue([ name, value ]);

            return;
        }

        try
        {
            await (this.#viewModel[name] = value);
        }
        catch(e)
        {
            throw new Exception(`Failed to set '${this.constructor.name}.${name}', '${value}' is not valid`, e, this);
        }
    }

    static async parseHtml(owner, scope, fragment)
    {
        return await Template.parseHtml(owner, scope, fragment, owner.#viewModel)
    }

    async _populate()
    {
        const keys = Object.keys(this.#viewModel);

        for(const key of keys)
        {
            this.#viewModel.$.props[key].emit('changed', { old: undefined, new: this.#viewModel[key] });
        }

        for(const [ key, value ] of this.#setQueue)
        {
            try
            {
                await this.#set(key, value);
            }
            catch(e)
            {
                throw new Error(`Failed to populate '${key}', '${value}' is not a valid value`);
            }
        }

        this.#queue.enqueue(
            ...this.#bindings
                .filter(b => b.keys.some(k => keys.includes(k)) === false)
                .map(b => b.nodes)
                .reduce((t, n) => [ ...t, ...n ], [])
                .unique()
        );
    }

    connectedCallback()
    {}

    disconnectedCallback()
    {}

    attributeChangedCallback(name, oldValue, newValue)
    {
        if(this.#bindings === null)
        {
            return;
        }

        this.#set(name.toCamelCase(), newValue);
    }

    cloneNode(deep = false)
    {
        const res = super.cloneNode(deep);

        for(const [ key, value ] of Object.entries(this.#viewModel))
        {
            res[key] = value;
        }

        return res;
    }

    set _bindings(bindings)
    {
        this.#bindings = bindings;
    }

    get internals()
    {
        // return this.#parent.internals;
        return this.#internals;
    }

    get shadow()
    {
        // return this.#parent.shadow;
        return this.#shadow;
    }

    get properties()
    {
        return this.#viewModel;
    }

    static get extends()
    {
        return HTMLElement;
    }

    static get observedAttributes()
    {
        return Object.keys(this.props).map(p => p.toDashCase());
    }

    static get properties()
    {
        return {};
    }

    static get props()
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
