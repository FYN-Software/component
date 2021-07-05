// import Base from './base.js';
// import Composer from './composer.js';
// import Style from '@fyn-software/core/style.js';
// import { clone } from '@fyn-software/core/extends.js';
// import Template from './template.js';
//
// type ElementProxy = {
//     [key: string]: HTMLElement|null;
// };
//
// // type CustomShadowRoot = ShadowRoot & {
// //     setProperty(property: string, value: any): void;
// //     getPropertyValue(property: string): any;
// //     style: CSSStyleSheet;
// // };
//
// export default abstract class Component<T extends Component<T>> extends Base<T> implements IComponent<T>
// {
//     private readonly _ready: Promise<void>;
//     private _isReady: boolean = false;
//     private _template: DocumentFragment|undefined;
//     private _sugar: ElementProxy = new Proxy({}, { get: (c: never, p: string) => this.shadow.getElementById(p) });
//     protected static localName: string;
//
//     protected constructor(args: ViewModelArgs<T> = {})
//     {
//         super(args);
//
//         const constructor = this.constructor as ComponentConstructor<T>;
//
//         void constructor.init();
//
//         if(Composer.fragments.hasOwnProperty(constructor.is) === false)
//         {
//             throw new Error('Expected a template, non found. did you register the component?')
//         }
//
//         this._ready = this.init();
//     }
//
//     protected async init(): Promise<void>
//     {
//         await Promise.delay(0);
//
//         await super.init();
//
//         const self = this.constructor as ComponentConstructor<T>;
//         const { html, css } = Composer.fragments[self.is];
//
//         super.shadow.adoptedStyleSheets = [ ...this.shadow.adoptedStyleSheets, ...Style.get(...self.styles), css ];
//
//         Object.defineProperties(this.shadow, {
//             style: {
//                 value: css,
//                 writable: false,
//                 configurable: false,
//                 enumerable: true,
//             },
//         });
//
//         await this.initialize();
//
//         // const { bindings, template } = (await this.parseTemplate(await Template.scan(this.shadow, Object.keys(this.properties))))
//         const { bindings, template } = (await this.parseTemplate(await html))
//             ?? { bindings: [], template: new DocumentFragment() };
//
//         super.bindings = bindings;
//         this._template = template;
//
//         // console.log(bindings, template);
//
//         super.shadow.appendChild(this._template);
//
//         this._isReady = true;
//
//         await this._populate();
//
//         await this.ready();
//
//         this.emit('ready');
//     }
//
//     protected async animateKey(key: keyof AnimationConfig, timing?: number): Promise<Animation>
//     {
//         const constructor = this.constructor as ComponentConstructor<T>
//
//         let options = clone<AnimationConfigArg>(constructor.animations[key]);
//
//         while(options[1].hasOwnProperty('extend'))
//         {
//             const newOptions = clone<AnimationConfigArg>(constructor.animations[options[1].extend!] ?? [[], {}]);
//
//             delete options[1].extend;
//
//             options = [ newOptions[0], { ...newOptions[1], ...options[1] } ];
//         }
//
//         const animation = super.animate(...options);
//
//         if(animation.effect === undefined || timing === null)
//         {
//             const duration = (animation.effect?.getTiming().duration as number) ?? 0;
//
//             await Promise.delay(duration * (timing ?? 0));
//
//             return animation;
//         }
//
//         return animation.finished;
//     }
//
//     protected abstract initialize(): Promise<void>;
//     protected abstract ready(): Promise<void>;
//
//     public async parseTemplate(fragment: IFragment<T>): Promise<ParsedTemplate<T>>
//     {
//         const { template, bindings } = await Base.parseHtml(this, this, fragment);
//
//         await Composer.prepare(template);
//
//         return { template, bindings };
//     }
//
//     public get shadow(): CustomShadowRoot
//     {
//         return super.shadow as CustomShadowRoot;
//     }
//
//     get $(): ElementProxy
//     {
//         return this._sugar;
//     }
//
//     get isReady(): Promise<void>
//     {
//         return this._ready;
//     }
//
//     /**
//      * @deprecated
//      */
//     static async fromString(tag: string, properties: string)
//     {
//         throw new Error('Do not use this method anymore');
//     }
//
//     static async init<T extends IBase<T>>(this: ComponentConstructor<T>): Promise<ComponentConstructor<T>>
//     {
//         await Composer.registerComponent(this);
//
//         return this;
//     }
//
//     static get is(): string
//     {
//         return this.localName || `${ this.name.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`).substr(1) }`;
//     }
//
//     static get animations(): AnimationConfig
//     {
//         return {};
//     }
// }