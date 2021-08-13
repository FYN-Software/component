export default class Fragment<T extends IBase<T>> implements IFragment<T>
{
    private readonly _template: Node;
    private readonly _map: Map<string, Binding>;

    constructor(template: Node, map: Map<string, Binding>)
    {
        this._template = template;
        this._map = map;
    }

    clone(): IFragment<T>
    {
        return new Fragment(this._template.cloneNode(true), new Map(this._map));
    }

    get template(): Node
    {
        return this._template;
    }

    get map(): Map<string, Binding>
    {
        return this._map;
    }
}