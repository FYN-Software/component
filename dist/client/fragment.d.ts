export default class Fragment<T extends IBase<T>> implements IFragment<T> {
    #private;
    constructor(template: Node, map: Map<string, Binding>);
    clone(): IFragment<T>;
    get template(): Node;
    get map(): Map<string, Binding>;
}
//# sourceMappingURL=fragment.d.ts.map