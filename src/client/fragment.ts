export default class Fragment<T extends IBase<T>> implements IFragment<T>
{
    readonly #template: Node;
    readonly #map: Map<string, Binding>;

    constructor(template: Node, map: Map<string, Binding>)
    {
        this.#template = template;
        this.#map = map;
    }

    clone(): IFragment<T>
    {
        return new Fragment(this.#template.cloneNode(true), new Map(this.#map));
    }

    get template(): Node
    {
        return this.#template;
    }

    get map(): Map<string, Binding>
    {
        return this.#map;
    }
}