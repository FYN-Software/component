export default abstract class Directive<T extends IBase<T> = any, TEvents extends EventDefinition = {}> extends EventTarget implements IDirective<T, TEvents>
{
    #node: Node;
    readonly #binding: IBinding<T>;
    readonly #scopes: Array<IScope>;

    public readonly events!: TEvents;

    public get scopes(): Array<IScope>
    {
        return this.#scopes;
    }

    public get node(): Node
    {
        return this.#node;
    }

    public get binding(): IBinding<T>
    {
        return this.#binding;
    }

    protected constructor(node: Node, binding: IBinding<T>, scopes: Array<IScope>)
    {
        super();

        this.#node = node;
        this.#binding = binding;
        this.#scopes = scopes;
    }

    public transferTo(node: Node): void
    {
        // TODO(Chris Kruining)
        //  I suspect there are plenty
        //  of edge-cases which need
        //  to do more then just
        //  re-assigning the node.

        this.#node = node;
    }

    abstract render(): Promise<void>;
}