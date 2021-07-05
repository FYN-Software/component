export default class Fragment<T extends IBase<T>> implements IFragment<T> {
    private readonly _template;
    private readonly _map;
    constructor(template: Node, map: Map<string, NewBinding>);
    clone(): IFragment<T>;
    get template(): Node;
    get map(): Map<string, NewBinding>;
}
//# sourceMappingURL=fragment.d.ts.map