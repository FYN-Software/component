export default abstract class Directive<T extends IBase<T>> implements IDirective<T> {
    private static _registry;
    private static _references;
    private _owner;
    private _scope;
    private _node;
    private _binding;
    get owner(): IBase<T>;
    get scope(): IScope<T>;
    get node(): Node;
    get binding(): IBinding<T>;
    protected constructor(owner: IBase<T>, scope: IScope<T>, node: Node, binding: IBinding<T>);
    transferTo(node: Node): void;
    abstract render(): Promise<void>;
    static get type(): string | undefined;
    static get<T extends IBase<T>>(name: string): Promise<DirectiveConstructor<T>>;
    static scan(node: Attr, map: Map<string, any>, allowedKeys?: Array<string>): Promise<FragmentLike>;
    static deserialize(mapping: DirectiveCache): Promise<void>;
    static register(name: string, path: string): void;
}
//# sourceMappingURL=directive.d.ts.map