import Base from './base.js';
declare type ElementProxy = {
    [key: string]: HTMLElement | undefined;
};
export default abstract class Component<T extends Component<T, TEvents>, TEvents extends EventDefinition = {}> extends Base<T, TEvents> implements IComponent<T> {
    #private;
    static readonly __observerLimit__: typeof Component;
    protected static localName: string;
    constructor(args?: ViewModelArgs<T>);
    protected init(): Promise<void>;
    protected abstract initialize(): Promise<void>;
    protected abstract ready(): Promise<void>;
    protected get $(): ElementProxy;
    static get is(): string;
    static define(): void;
}
export {};
//# sourceMappingURL=component.d.ts.map