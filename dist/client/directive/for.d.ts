import Directive from './directive.js';
declare type ForConf<T extends IBase<T>> = {
    fragment: IFragment<T>;
    name?: string;
    key?: string;
};
export default class For<T extends IBase<T>> extends Directive<T> {
    private static _indices;
    private readonly _key;
    private readonly _name;
    private _fragment;
    private _items;
    private _initialized;
    constructor(node: Node, binding: IBinding<T>, scopes: Array<IScope>, { fragment, name, key }: ForConf<T>);
    get fragment(): IFragment<T>;
    set fragment(fragment: IFragment<T>);
    private _initialize;
    render(): Promise<void>;
    static get indices(): WeakMap<object, any>;
}
export {};
//# sourceMappingURL=for.d.ts.map