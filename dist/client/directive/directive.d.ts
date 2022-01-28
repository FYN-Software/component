export default abstract class Directive<T extends IBase<T> = any, TEvents extends EventDefinition = {}> extends EventTarget implements IDirective<T, TEvents> {
    #private;
    readonly events: TEvents;
    get scopes(): Array<IScope>;
    get node(): Node;
    get binding(): IBinding<T>;
    protected constructor(node: Node, binding: IBinding<T>, scopes: Array<IScope>);
    transferTo(node: Node): void;
    abstract render(): Promise<void>;
}
//# sourceMappingURL=directive.d.ts.map