export default abstract class Directive<T extends IBase<T>> implements IDirective<T> {
    private _node;
    private readonly _binding;
    private readonly _scopes;
    get scopes(): Array<IScope>;
    get node(): Node;
    get binding(): IBinding<T>;
    protected constructor(node: Node, binding: IBinding<T>, scopes: Array<IScope>);
    transferTo(node: Node): void;
    abstract render(): Promise<void>;
}
//# sourceMappingURL=directive.d.ts.map