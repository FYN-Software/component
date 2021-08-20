export default class Binding<T extends IBase<T>> implements IBinding<T> {
    private readonly _tag;
    private readonly _keys;
    private readonly _code;
    private readonly _nodes;
    private _value;
    private readonly _callable;
    constructor(tag: string, callable: AsyncFunction);
    get tag(): string;
    get keys(): Array<string>;
    get code(): string;
    get nodes(): Set<Node>;
    get value(): any;
    resolve(scopes: Array<IScope>, plugins: IPluginContainer): Promise<any>;
}
//# sourceMappingURL=binding.d.ts.map