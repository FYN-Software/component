export default abstract class Directive<T extends IBase<T>> implements IDirective<T> {
    private static _registry;
    private static _references;
    private _node;
    private readonly _binding;
    private readonly _scopes;
    get scopes(): Array<IScope>;
    get node(): Node;
    get binding(): IBinding<T>;
    protected constructor(node: Node, binding: IBinding<T>, scopes: Array<IScope>);
    transferTo(node: Node): void;
    abstract render(): Promise<void>;
    static get type(): string | undefined;
    static get<T extends IBase<T>>(name: string): Promise<DirectiveConstructor<T>>;
    static register(name: string, path: string): void;
}
//# sourceMappingURL=directive.d.ts.map