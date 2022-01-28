import Base from './base.js';
import { hydrate, mapFor } from './template.js';
import Fragment from './fragment.js';
import { delay } from '@fyn-software/core/function/promise.js';

type ElementProxy = {
    [key: string]: HTMLElement|undefined;
};

export default abstract class Component<T extends Component<T, TEvents>, TEvents extends EventDefinition = {}> extends Base<T, TEvents> implements IComponent<T>
{
    static readonly __observerLimit__ = Component;
    protected static localName: string;

    readonly #ready: Promise<void>;
    readonly #sugar: ElementProxy = new Proxy({}, { get: (c: never, p: string) => this.shadow.getElementById(p) });

    public constructor(args: ViewModelArgs<T> = {})
    {
        new.target.define();

        super(args);

        this.#ready = this.init();
    }

    protected async init(): Promise<void>
    {
        // NOTE(Chris Kruining)
        //  Delay so that the constructors of
        //  derived classes have ran before
        //  running the initialization
        await delay(0);

        await super.init();

        Object.defineProperties(this.shadow, {
            style: {
                value: new CSSStyleSheet(), // TODO(Chris Kruining) Get the actual style from the shadow
                writable: false,
                configurable: false,
                enumerable: true,
            },
        });

        await this.initialize();

        const { bindings } = await hydrate<T>([ this ], new Fragment<T>(this.shadow, mapFor(this.localName)!));

        super.bindings = bindings;

        await this._populate();

        await this.ready();

        this.emit('ready');
    }

    protected abstract initialize(): Promise<void>;
    protected abstract ready(): Promise<void>;

    protected get $(): ElementProxy
    {
        return this.#sugar;
    }

    static get is(): string
    {
        return this.localName || `${ this.name.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`).substr(1) }`;
    }

    public static define()
    {
        if(globalThis.customElements.get(this.is) === undefined)
        {
            globalThis.customElements.define(this.is, this as unknown as CustomElementConstructor);
        }
    }
}