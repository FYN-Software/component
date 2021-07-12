import { equals } from '@fyn-software/core/extends.js';
import Event from '@fyn-software/core/event.js';
import Queue from '@fyn-software/core/queue.js';
import Template, { uuidRegex } from './template.js';
import Exception from '@fyn-software/core/exception.js';

const properties: WeakMap<Function, Map<string, PropertyConfig<any>>> = new WeakMap;

export class Model<T extends IBase<T>> extends EventTarget
{
    constructor(owner: IBase<T>, properties: Map<string, PropertyConfig<T>>, args: ViewModelArgs<T> = {})
    {
        super();

        for(const [ key, propertyConfig ] of Array.from(properties.entries()))
        {
            const k = key as keyof T;
            const value = new ValueContainer<T>(owner, args[k]!, propertyConfig);

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

class ValueContainer<T extends IBase<T>> extends EventTarget implements ViewModelField<T[keyof T]>
{
    private _value: T[keyof T];
    private readonly _owner: IBase<T>;
    private readonly _config: PropertyConfig<T>;

    public constructor(owner: IBase<T>, value: T[keyof T], config: PropertyConfig<T>)
    {
        super();

        this._value = value;
        this._owner = owner;
        this._config = config;
    }

    public get value(): T[keyof T]
    {
        return this._value;
    }

    public async setValue(value: T[keyof T]): Promise<void>
    {
        const old = this._value;
        const setter: Setter<T> = this._config.set ?? (v => v);

        this._value = setter.call(this._owner, value);

        if(equals(old, this._value) === false)
        {
            this.emit('changed', { old, new: this._value });
        }
    }
}

export default abstract class Base<T extends Base<T>> extends HTMLElement implements IBase<T>
{
    private static _observers = new WeakMap();
    private _bindings: Array<IBinding<T>>|undefined;
    private readonly _internals: ElementInternals = this.attachInternals();
    private readonly _shadow: ShadowRoot;
    private readonly _queue: Queue<Node> = new Queue;
    private readonly _setQueue: Map<keyof T, T[keyof T]> = new Map;
    private readonly _properties: Map<string, PropertyConfig<T>>;
    private readonly _viewModel: ViewModel<T>;
    private _initialized: boolean = false;

    protected constructor(args: ViewModelArgs<T> = {})
    {
        super();

        this._shadow = this._internals.shadowRoot ?? this.attachShadow({ mode: 'closed', delegatesFocus: false });
        const sheet = new CSSStyleSheet();

        this._shadow.adoptedStyleSheets = [ sheet ];

        sheet.insertRule(`:host{}`, 0);
        const rule = sheet.cssRules[0] as CSSStyleRule;

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

        this._viewModel = new Model<T>(this, this._properties, args) as ViewModel<T>;
        this._viewModel.on({
            changed: async ({ property, old: o, new: n }: { property: string, old: T[keyof T], new: T[keyof T]}) => {
                for(const c of Base._observers.get(this)?.get(property) ?? [])
                {
                    c.apply(this._viewModel[property as keyof T].value, [ o, n ]);
                }

                const bindings = this._bindings?.filter(b => b.keys.includes(property)) ?? [];

                await Promise.all(bindings.map(b => b.resolve([ this ])));

                const mapper = this._properties.get(property)?.bindToCSS
                if(mapper !== undefined)
                {
                    this.shadow.setProperty(`--${property}`, mapper(n));
                }

                const nodes = bindings.map(b => b.nodes)
                    .reduce((t: Array<Node>, n: Set<Node>) => [ ...t, ...n ], [])
                    .unique();

                this._queue.enqueue(...nodes);
            },
        });

        this._queue.on({
            enqueued: Event.debounce(10, async () => {
                for await(const n of this._queue)
                {
                    await Template.render<T>(n);
                }
            }),
        });
    }

    protected async init(): Promise<void>
    {
        this._initialized = true;

        for(const [ k, p ] of this._properties)
        {
            const { aliasFor }: PropertyConfig<T> = p;
            const key = (aliasFor ?? k) as keyof T;

            this._viewModel[key].setValue(this[key]);

            Object.defineProperty(this, k, {
                get(): T[keyof T]
                {
                    return this._viewModel[key].value;
                },
                set(value: T[keyof T]): Promise<void>
                {
                    return this._initialized ? this._set(key, value) : this._viewModel[key].setValue(value);
                },
                enumerable: true,
                configurable: false,
            });

            const v: any = this._viewModel[key].value;
            const attr = this.getAttribute(k.toDashCase());
            const value = (this.hasAttribute(k.toDashCase()) && attr === '' && typeof v === 'boolean')
                || ((attr?.match(uuidRegex) || attr?.includes('{{') ? null : attr) ?? v);

            void this._set(key, value);
        }
    }

    public observe(config: ObserverConfig<T>): IBase<T>
    {
        const keys = Object.keys(this._viewModel!) as Array<keyof T>;

        for(const [ p, c ] of Object.entries(config) as Array<[ keyof T, Observer<T[keyof T]> ]>)
        {
            if(keys.includes(p) !== true)
            {
                throw new Error(`Trying to observe non-observable property '${p}'`);
            }

            if(Base._observers.has(this) === false)
            {
                Base._observers.set(this, new Map);
            }

            const observers = Base._observers.get(this);

            if(observers.has(p) === false)
            {
                observers.set(p, []);
            }

            observers.get(p).push(c);
        }

        return this;
    }

    private async _set(name: keyof T, value: any): Promise<void>
    {
        // TODO(Chris Kruining)
        //  I think the setQueue is obsolete
        //  if there is no longer any waiting
        //  on resources from the network
        if(this._bindings === undefined)
        {
            this._setQueue.set(name, value);

            return;
        }

        try
        {
            await this._viewModel[name].setValue(value);
        }
        catch(e)
        {
            throw new Exception(`Failed to set '${this.constructor.name}.${name}', '${value}' is not valid`, e, this);
        }
    }

    protected async _populate()
    {
        const keys = Object.keys(this._viewModel!);

        for(const key of keys as Array<keyof T>)
        {
            this._viewModel![key].emit('changed', { old: undefined, new: this._viewModel![key].value });
        }

        for(const [ key, value ] of this._setQueue.entries())
        {
            try
            {
                await this._set(key, value);
            }
            catch(e)
            {
                throw new Error(`Failed to populate '${key}', '${value}' is not a valid value`);
            }
        }

        this._queue.enqueue(
            ...this._bindings!
                .filter(b => b.keys.some(k => keys.includes(k)) === false)
                .map(b => b.nodes)
                .reduce((t: Array<Node>, n: Set<Node>) => [ ...t, ...n ], [])
                .unique()
        );
    }

    public connectedCallback(): void
    {

    }

    public disconnectedCallback(): void
    {

    }

    public attributeChangedCallback(name: string, oldValue: any, newValue: any): void
    {
        if(this._bindings === undefined)
        {
            return;
        }

        void this._set(name.toCamelCase() as keyof T, newValue);
    }

    public cloneNode(deep: boolean = false): IBase<T>
    {
        const res = super.cloneNode(deep) as { [Key in keyof T]: T[Key]|undefined };

        for(const [ key, field ] of Object.entries(this._viewModel!) as Array<[ keyof T, ViewModelField<T[keyof T]> ]>)
        {
            res[key] = field.value;
        }

        return res as unknown as IBase<T>;
    }

    protected set bindings(bindings: Array<IBinding<T>>)
    {
        this._bindings = bindings;
    }

    protected get internals()
    {
        return this._internals;
    }

    public get shadow(): CustomShadowRoot
    {
        return this._shadow as CustomShadowRoot;
    }

    public get properties(): ViewModel<T>
    {
        return this._viewModel!;
    }

    public static get observedAttributes(): Array<string>
    {
        return Array.from(this.getPropertiesOf(this)?.keys() ?? []);
    }
    public static get properties(): Array<string>
    {
        return Array.from(this.getPropertiesOf(this)?.keys() ?? []);
    }

    private static getPropertiesOf(ctor: Function): Map<string, PropertyConfig<any>>
    {
        let props: Array<[ string, PropertyConfig<any> ]> = [];

        while(ctor !== Base)
        {
            props = [ ...props, ...(properties.get(ctor)?.entries() ?? []) ];

            ctor = Object.getPrototypeOf(ctor);
        }

        return new Map(props);
    }

    public static registerProperty<T extends IBase<T>>(
        target: BaseConstructor<T>,
        key: keyof T,
        options: PropertyConfig<T> = {}
    ): void
    {
        if(properties.has(target) === false)
        {
            properties.set(target, new Map);
        }

        properties.get(target)!.set(key as string, options);
    }
}