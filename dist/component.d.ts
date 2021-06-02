import Base from './base.js';
declare type ElementProxy = {
    [key: string]: HTMLElement | null;
};
declare type CustomShadowRoot = ShadowRoot & {
    setProperty(property: string, value: any): void;
    getPropertyValue(property: string): any;
    style: CSSStyleSheet;
};
export default abstract class Component<T extends Component<T>> extends Base<T> implements IComponent<T> {
    private readonly _ready;
    private _isReady;
    private _template;
    private _sugar;
    protected static localName: string;
    protected constructor(args?: ViewModelArgs<T>);
    protected init(): Promise<void>;
    protected animateKey(key: keyof AnimationConfig, timing?: number): Promise<Animation>;
    protected abstract initialize(): Promise<void>;
    protected abstract ready(): Promise<void>;
    parseTemplate(fragment: IFragment<T>): Promise<ParsedTemplate<T>>;
    get shadow(): CustomShadowRoot;
    get $(): ElementProxy;
    get isReady(): Promise<void>;
    /**
     * @deprecated
     */
    static fromString(tag: string, properties: string): Promise<void>;
    static init<T extends IBase<T>>(this: ComponentConstructor<T>): Promise<ComponentConstructor<T>>;
    static get is(): string;
    static get animations(): AnimationConfig;
}
export {};
//# sourceMappingURL=component.d.ts.map