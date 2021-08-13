export declare class Model<T extends IBase<T>> extends EventTarget {
    constructor(owner: T, properties: Map<string, PropertyConfig<T>>, args?: ViewModelArgs<T>);
}
export default abstract class Base<T extends Base<T, TEvents>, TEvents extends EventDefinition> extends HTMLElement implements IBase<T, TEvents> {
    private static _observers;
    private _bindings;
    private readonly _internals;
    private readonly _shadow;
    private readonly _queue;
    private readonly _setQueue;
    private readonly _properties;
    private readonly _viewModel;
    private _initialized;
    events: TEvents;
    protected constructor(args?: ViewModelArgs<T>);
    protected init(): Promise<void>;
    observe(config: ObserverConfig<T>): IBase<T, TEvents>;
    private _set;
    protected _populate(): Promise<void>;
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, oldValue: any, newValue: any): void;
    cloneNode(deep?: boolean): IBase<T, TEvents>;
    protected set bindings(bindings: Array<IBinding<T>>);
    protected get internals(): ElementInternals;
    get shadow(): CustomShadowRoot;
    get properties(): ViewModel<T>;
    static get observedAttributes(): Array<string>;
    static get properties(): Array<string>;
    private static getPropertiesOf;
    static registerProperty<T extends IBase<T, TEvents>, TEvents = {}>(target: BaseConstructor<T, TEvents>, key: keyof T, options?: PropertyConfig<T>): void;
}
//# sourceMappingURL=base.d.ts.map