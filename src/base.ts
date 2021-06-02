import { equals } from '@fyn-software/core/extends.js';
import Event from '@fyn-software/core/event.js';
import Queue from '@fyn-software/core/queue.js';
import Template from './template.js';
import Exception from '@fyn-software/core/exception.js';

const properties: WeakMap<Function, Map<string, PropertyConfig<any>>> = new WeakMap;

export class Model<T extends IBase<T>> extends EventTarget
{
    constructor(owner: T, properties: Map<string, PropertyConfig<T>>, args?: ViewModelArgs<T>)
    {
        super();

        for(const [ key, propertyConfig ] of Array.from(properties.entries()))
        {
            const k = key as keyof T;
            const value = new ValueContainer<T>(owner, args?.[k], propertyConfig);

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
    private readonly _owner: T;
    private readonly _config: PropertyConfig<T>;

    public constructor(owner: T, value: T[keyof T]|undefined, config: PropertyConfig<T>)
    {
        super();

        this._value = value ?? config.default;
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
    private readonly _args: ViewModelArgs<T>;
    private readonly _self: ViewModelArgs<T> = {};
    private _viewModel: ViewModel<T>;

    protected constructor(args: ViewModelArgs<T> = {})
    {
        super();

        this._args = args;
        this._shadow = this._internals.shadowRoot ?? this.attachShadow({ mode: 'closed' });
        this._properties = Base.getPropertiesOf(this.constructor);

        this._viewModel = new Model<T>(this, this._properties, this._args) as ViewModel<T>;
        this._viewModel.on({
            changed: async ({ property, old: o, new: n }: { property: keyof T, old: T[keyof T], new: T[keyof T]}) => {
                for(const c of Base._observers.get(this)?.get(property) ?? [])
                {
                    c.apply(this._viewModel[property].value, [ o, n ]);
                }

                const bindings = this._bindings?.filter(b => b.keys.includes(property)) ?? [];

                await Promise.all(bindings.map(b => b.resolve(this)));

                const nodes = bindings.map(b => b.nodes)
                    .reduce((t: Array<Node>, n: Set<Node>) => [ ...t, ...n ], [])
                    .unique();

                this._queue.enqueue(...nodes);
            },
        });

        console.log('kaas is awesome');

        for(const [ k, p ] of this._properties)
        {
            const { aliasFor } = p as PropertyConfig<T>;

            Object.defineProperty(this, k, {
                get(): T[keyof T]
                {
                    return this._viewModel?.[aliasFor ?? k].value ?? this._self[k];
                },
                set(value: T[keyof T]): Promise<void>
                {
                    if(this._viewModel === undefined)
                    {
                        this._self[k] = value;

                        return ;
                    }
                    return this._viewModel![k].setValue(value);
                },
                enumerable: true,
                configurable: false,
            });
        }

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
        for(const [ k, p ] of this._properties)
        {
            const key = k as keyof T;
            const { name, aliasFor } = p as PropertyConfig<T>;

            if(aliasFor !== undefined)
            {
                continue;
            }

            const v: any = this._viewModel[key].value;
            const attr = this.getAttribute(name.toDashCase());
            const value = (this.hasAttribute(name.toDashCase()) && attr === '' && typeof v === 'boolean')
                || ((attr?.startsWith('{_') || attr?.includes('{{') ? null : attr) ?? v);

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
        if(this._bindings === undefined)
        {
            this._setQueue.set(name, value);

            return;
        }

        try
        {
            await this._viewModel![name].setValue(value);
        }
        catch(e)
        {
            throw new Exception(`Failed to set '${this.constructor.name}.${name}', '${value}' is not valid`, e, this);
        }
    }

    public static async parseHtml<T extends Base<T>>(owner: Base<T>, scope: IScope<T>, fragment: IFragment<T>): Promise<ParsedTemplate<T>>
    {
        return Template.parseHtml(owner, scope, fragment.clone(), owner._viewModel!);
    }

    protected async _populate()
    {
        const keys = Object.keys(this._viewModel!) as Array<keyof T>;

        for(const key of keys)
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
    {}

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

    public get shadow(): ShadowRoot
    {
        return this._shadow;
    }

    public get properties(): ViewModel<T>
    {
        return this._viewModel!;
    }

    public static get observedAttributes(): Array<string>
    {
        return Array.from(this.getPropertiesOf(this)?.values() ?? [], p => p.name);
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
        options: PropertyOptions<T> = {}
    ): void
    {
        const config: PropertyConfig<T> = {
            ...options,
            name: options.name ?? String(key),
            default: options.default ?? undefined,
        };

        if(properties.has(target) === false)
        {
            properties.set(target, new Map);
        }

        properties.get(target)!.set(String(key), config);
    }
}