export default class Binding<T extends IBase<T>> implements IBinding<T> {
    private readonly _tag;
    private readonly _original;
    private readonly _expression;
    private readonly _keys;
    private readonly _nodes;
    private _value;
    private readonly _callable;
    constructor(tag: string, original: string, expression: string, keys: Array<keyof T>, callable: AsyncFunction);
    get tag(): string;
    get expression(): string;
    get original(): string;
    get keys(): Array<keyof T>;
    get nodes(): Set<Node>;
    get value(): any;
    resolve(scope: IScope<T>, self: IScope<T>): Promise<any>;
}
//# sourceMappingURL=binding.d.ts.map