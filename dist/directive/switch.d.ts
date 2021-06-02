import Directive from './directive.js';
declare type SwitchConf<T extends IBase<T>> = {
    defaultCase: IFragment<T>;
    cases: Map<string, IFragment<T>>;
};
export default class Switch<T extends IBase<T>> extends Directive<T> {
    private readonly _defaultCase;
    private readonly _cases;
    private _items;
    private readonly _initialized;
    constructor(owner: IBase<T>, scope: IScope<T>, node: Node, binding: IBinding<T>, { defaultCase, cases }: SwitchConf<T>);
    private _initialize;
    render(): Promise<void>;
    static scan(node: Attr, map: Map<string, any>, allowedKeys?: any[]): Promise<FragmentLike>;
    static deserialize(mapping: DirectiveCache): Promise<void>;
}
export {};
//# sourceMappingURL=switch.d.ts.map