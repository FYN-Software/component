export default class Fragment implements IFragment {
    private readonly _template;
    private readonly _map;
    constructor(template: DocumentFragment, map: BindingLikeMap);
    clone(): IFragment;
    load(): Promise<void>;
    get template(): DocumentFragment;
    get map(): BindingLikeMap;
}
//# sourceMappingURL=fragment.d.ts.map