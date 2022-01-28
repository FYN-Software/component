export default class Binding<T extends IBase<T>> implements IBinding<T> {
    #private;
    constructor(tag: string, callable: AsyncFunction);
    get tag(): string;
    get keys(): Array<string>;
    get nodes(): Set<Node>;
    get value(): any;
    resolve(scopes: Array<IScope>, plugins: IPluginContainer): Promise<any>;
}
//# sourceMappingURL=binding.d.ts.map