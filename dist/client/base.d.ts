export default abstract class Base<T extends Base<T, TEvents>, TEvents extends EventDefinition> extends HTMLElement implements IBase<T, TEvents> {
    #private;
    protected constructor(args?: Partial<T>);
    protected init(): Promise<void>;
    observe(config: ObserverConfig<T>): IBase<T, EventsType<T>>;
    protected _populate(): Promise<void>;
    attributeChangedCallback(name: string, oldValue: any, newValue: any): void;
    protected set bindings(bindings: Array<IBinding<T>>);
    protected get internals(): ElementInternals;
    get shadow(): CustomShadowRoot;
    get properties(): T;
    get viewModel(): IObservable<T>;
    static get observedAttributes(): Array<string>;
    private static getPropertiesOf;
    static registerProperty<T extends IBase<T, EventsType<T>>>(target: BaseConstructor<T>, key: keyof T, options?: PropertyConfig<T>): void;
}
//# sourceMappingURL=base.d.ts.map