import Base from './base.js';
declare type ElementProxy = {
    [key: string]: HTMLElement | undefined;
};
export default abstract class Component<T extends Component<T, TEvents>, TEvents extends EventDefinition = {}> extends Base<T, TEvents> implements IComponent<T> {
    private readonly _ready;
    private _sugar;
    protected static localName: string;
    constructor(args?: ViewModelArgs<T>);
    protected init(): Promise<void>;
    protected animateKey(key: keyof AnimationConfig, timing?: number): Promise<Animation>;
    protected abstract initialize(): Promise<void>;
    protected abstract ready(): Promise<void>;
    get $(): ElementProxy;
    get isReady(): Promise<void>;
    static get is(): string;
    static get animations(): AnimationConfig;
    static define(): void;
}
export {};
//# sourceMappingURL=component.d.ts.map