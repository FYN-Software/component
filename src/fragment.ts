import Composer from './composer.js';

export default class Fragment implements IFragment
{
    private readonly _template: DocumentFragment;
    private readonly _map: BindingLikeMap;

    constructor(template: DocumentFragment, map: BindingLikeMap)
    {
        this._template = template;
        this._map = map;
    }

    clone(): IFragment
    {
        return new Fragment(
            this._template.cloneNode(true) as DocumentFragment,
            new Map(this._map),
        );
    }

    async load(): Promise<void>
    {
        await Promise.all(
            Array.from(this._template.querySelectorAll(':not(:defined)'))
                .unique()
                .map(n => Composer.load(n.localName))
        );
    }

    get template(): DocumentFragment
    {
        return this._template;
    }

    get map(): BindingLikeMap
    {
        return this._map;
    }
}