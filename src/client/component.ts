import Base from './base.js';
import { clone } from '@fyn-software/core/extends.js';
import Template from './template.js';
import Fragment from './fragment.js';

type ElementProxy = {
    [key: string]: HTMLElement|null;
};

export default abstract class Component<T extends Component<T>> extends Base<T> implements IComponent<T>
{
    private readonly _ready: Promise<void>;
    private _sugar: ElementProxy = new Proxy({}, { get: (c: never, p: string) => this.shadow.getElementById(p) });
    protected static localName: string;

    protected constructor(args: ViewModelArgs<T> = {})
    {
        super(args);

        this._ready = this.init();
    }

    protected async init(): Promise<void>
    {
        // NOTE(Chris Kruining)
        //  Delay so that the constructors of
        //  derived classes have run before
        //  running the initialization
        await Promise.delay(0);

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

        const { bindings } = await Template.hydrate<T>([ this ], new Fragment<T>(this.shadow, Template.mapFor(this.localName)!));

        super.bindings = bindings;

        await this._populate();

        await this.ready();

        this.emit('ready');
    }

    protected async animateKey(key: keyof AnimationConfig, timing?: number): Promise<Animation>
    {
        const constructor = this.constructor as ComponentConstructor<T>

        let options = clone<AnimationConfigArg>(constructor.animations[key]);

        while(options[1].hasOwnProperty('extend'))
        {
            const newOptions = clone<AnimationConfigArg>(constructor.animations[options[1].extend!] ?? [[], {}]);

            delete options[1].extend;

            options = [ newOptions[0], { ...newOptions[1], ...options[1] } ];
        }

        const animation = super.animate(...options);

        if(animation.effect === undefined || timing === null)
        {
            const duration = (animation.effect?.getTiming().duration as number) ?? 0;

            await Promise.delay(duration * (timing ?? 0));

            return animation;
        }

        return animation.finished;
    }

    protected abstract initialize(): Promise<void>;
    protected abstract ready(): Promise<void>;

    get $(): ElementProxy
    {
        return this._sugar;
    }

    get isReady(): Promise<void>
    {
        return this._ready;
    }

    static get is(): string
    {
        return this.localName || `${ this.name.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`).substr(1) }`;
    }

    // TODO(Chris Kruining)
    //  Convert this to a decorator,
    //  or better yet; make it obsolete
    static get animations(): AnimationConfig
    {
        return {};
    }

    public static define()
    {
        if(globalThis.customElements.get(this.is) === undefined)
        {
            globalThis.customElements.define(this.is, this as unknown as CustomElementConstructor);
        }
    }

    public static upgrade()
    {
        if(globalThis.customElements.get(this.is) === undefined)
        {
            return;
        }

        globalThis.customElements.get(this.is);
    }
}