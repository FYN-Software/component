export default abstract class Directive<T extends IBase<T>> implements IDirective<T>
{
    private _node: Node;
    private readonly _binding: IBinding<T>;
    private readonly _scopes: Array<IScope>;

    public get scopes(): Array<IScope>
    {
        return this._scopes;
    }

    public get node(): Node
    {
        return this._node;
    }

    public get binding(): IBinding<T>
    {
        return this._binding;
    }

    protected constructor(node: Node, binding: IBinding<T>, scopes: Array<IScope>)
    {
        this._node = node;
        this._binding = binding;
        this._scopes = scopes;
    }

    public transferTo(node: Node): void
    {
        // TODO(Chris Kruining)
        //  I suspect there are plenty
        //  of edge-cases which need
        //  to do more then just
        //  re-assigning the node.

        this._node = node;
    }

    abstract render(): Promise<void>;
}