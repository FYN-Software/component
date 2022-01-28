import { getPropertiesOf } from '@fyn-software/core/function/common.js';
import observe from '@fyn-software/core/observable.js';
import { debounce } from '@fyn-software/core/event.js';
import Queue from '@fyn-software/core/queue.js';
import { render, uuidRegex, plugins } from './template.js';
import Exception from '@fyn-software/core/exception.js';
import { unique } from '@fyn-software/core/function/array.js';
import { toCamelCase, toDashCase } from '@fyn-software/core/function/string.js';

const properties: WeakMap<Function, Map<string, PropertyConfig<any>>> = new WeakMap;

export default abstract class Base<T extends Base<T, TEvents>, TEvents extends EventDefinition> extends HTMLElement implements IBase<T, TEvents>
{
    static #observers = new WeakMap();
    readonly #internals: ElementInternals = this.attachInternals();
    readonly #shadow: ShadowRoot;
    readonly #queue: Queue<Node> = new Queue;
    readonly #properties: Map<string, PropertyConfig<T>>;
    readonly #initialArgs: Partial<T>;
    #bindings: Array<IBinding<T>>|undefined;
    #viewModel!: IObservable<T>;

    protected constructor(args: Partial<T> = {})
    {
        super();

        this.#initialArgs = args;
        this.#shadow = this.#internals.shadowRoot ?? this.attachShadow({ mode: 'closed', delegatesFocus: false });

        // TODO(Chris Kruining) dumb "fix" for chrome bug, fixed in chrome 94.
        let rule: CSSStyleRule;

        try
        {
            rule = this.#shadow.styleSheets[0].cssRules[0] as CSSStyleRule;
        }
        catch
        {
            const sheet = new CSSStyleSheet();
            sheet.addRule(':host');

            rule = sheet.cssRules[0] as CSSStyleRule;
        }

        // const rule: CSSStyleRule = this.#shadow.styleSheets[0].cssRules[0] as CSSStyleRule;
        Object.defineProperties(this.#shadow, {
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

        this.#properties = Base.getPropertiesOf(this.constructor);
        this.#queue.on({
            enqueued: debounce(10, async () => {
                for await(const n of this.#queue)
                {
                    await render<T>(n);
                }

                this.emit('#rendered');
            }),
        });
    }

    protected async init(): Promise<void>
    {
        const props = getPropertiesOf(this);

        for(const d of Object.values(props))
        {
            if(d.get)
            {
                d.get = d.get.bind(this);
            }

            if(d.set)
            {
                d.set = d.set.bind(this);
            }
        }

        for(const attribute of this.attributes)
        {
            const k = toCamelCase(attribute.localName) as keyof T;

            if(props.hasOwnProperty(k) === false)
            {
                continue;
            }

            const v = (attribute.value === '' && typeof this[k] === 'boolean')
                || (attribute.value.match(uuidRegex) === null ? attribute.value : this[k]);

            if(props[k].writable)
            {
                props[k].value = v;
            }
            else if(props[k].set)
            {
                props[k].set(v);
            }
        }

        for(const [ k, v ] of Object.entries(this.#initialArgs))
        {
            if(props.hasOwnProperty(k) === false)
            {
                continue;
            }

            if(props[k as keyof T].writable)
            {
                props[k].value = v;
            }
            else if(props[k].set)
            {
                props[k].set(v);
            }
        }

        const model = {};

        Object.defineProperties(model, props);

        this.#viewModel = observe(model as unknown as T);
        this.#viewModel.on({
            changed: async ({ property, target, old: o, new: n }) => {
                if(target !== this.#viewModel)
                {
                    return;
                }

                for(const c of Base.#observers.get(this)?.get(property) ?? [])
                {
                    c.apply(this.properties[property as keyof T], [o, n]);
                }

                const bindings = this.#bindings?.filter(b => b.keys.includes(property)) ?? [];
                await Promise.all(bindings.map(b => b.resolve([this], plugins)));

                const mapper = this.#properties.get(property)?.bindToCSS;
                if(mapper !== undefined)
                {
                    this.shadow.setProperty(`--${property}`, mapper(n));
                }

                const nodes = unique(bindings.map(b => b.nodes).reduce((t, n) => [...t, ...n], []));
                this.#queue.enqueue(...nodes);
            },
        });

        for(const k of Object.keys(this.properties))
        {
            Object.defineProperty(this, k, {
                get: () => this.properties[k as keyof T],
                set: value => this.properties[k as keyof T] = value,
                enumerable: true,
                configurable: false,
            });
        }
    }

    public observe(config: ObserverConfig<T>): IBase<T, EventsType<T>>
    {
        for(const [ p, c ] of Object.entries(config) as Array<[ keyof T, Observer<T[keyof T]> ]>)
        {
            if((p in this.properties) !== true)
            {
                throw new Error(`Trying to observe non-observable property '${p}'`);
            }

            if(Base.#observers.has(this) === false)
            {
                Base.#observers.set(this, new Map);
            }

            const observers = Base.#observers.get(this);

            if(observers.has(p) === false)
            {
                observers.set(p, []);
            }

            observers.get(p).push(c);
        }

        return this;
    }

    protected async _populate()
    {
        for(const key of Object.getOwnPropertyNames(this.properties) as IterableIterator<keyof T>)
        {
            this.#viewModel.emit('changed', {
                old: undefined,
                new: this.properties[key],
                property: key as string,
                target: this.#viewModel
            });
        }
    }

    public attributeChangedCallback(name: string, oldValue: any, newValue: any): void
    {
        if(this.#bindings === undefined)
        {
            return;
        }

        this.properties[toCamelCase(name) as keyof T] = newValue;
    }

    protected set bindings(bindings: Array<IBinding<T>>)
    {
        this.#bindings = bindings;
    }

    protected get internals()
    {
        return this.#internals;
    }

    public get shadow(): CustomShadowRoot
    {
        return this.#shadow as CustomShadowRoot;
    }

    public get properties(): T
    {
        return this.#viewModel.get();
    }

    public get viewModel(): IObservable<T>
    {
        return this.#viewModel;
    }

    public static get observedAttributes(): Array<string>
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

    public static registerProperty<T extends IBase<T, EventsType<T>>>(
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