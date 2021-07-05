export default abstract class Directive<T extends IBase<T>> implements IDirective<T>
{
    private static _registry: Map<string, string> = new Map();
    private static _references: WeakMap<DirectiveConstructor<any>, string> = new WeakMap();

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

    static get type(): string|undefined
    {
        return this._references.get(this as unknown as DirectiveConstructor<any>);
    }

    public static async get<T extends IBase<T>>(name: string): Promise<DirectiveConstructor<T>>
    {
        if(this._registry.has(name) === false)
        {
            throw new Error(`Directive with name '${name}' is not registered, you can do so by calling "Directive.register('name-of-directive', 'path/to/directive')"`);
        }

        const directive: DirectiveConstructor<T> = (await import(this._registry.get(name)!)).default ?? null;

        this._references.set(directive, name);

        return directive;
    }

    static register(name: string, path: string)
    {
        this._registry.set(name, path);
    }
}

Directive.register('if', './if.js');
Directive.register('for', './for.js');
Directive.register('switch', './switch.js');
Directive.register('template', './template.js');