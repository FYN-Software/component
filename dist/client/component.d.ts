import Base from './base.js';
declare type ElementProxy = {
    [key: string]: HTMLElement | null;
};
export default abstract class Component<T extends Component<T>> extends Base<T> implements IComponent<T> {
    private readonly _ready;
    private _sugar;
    protected static localName: string;
    protected constructor(args?: ViewModelArgs<T>);
    protected init(): Promise<void>;
    protected animateKey(key: keyof AnimationConfig, timing?: number): Promise<Animation>;
    protected abstract initialize(): Promise<void>;
    protected abstract ready(): Promise<void>;
    get $(): ElementProxy;
    get isReady(): Promise<void>;
    static get is(): string;
    static get animations(): AnimationConfig;
    static define(): void;
    static upgrade(): void;
}
export {};
//# sourceMappingURL=component.d.ts.map