import Directive from './directive.js';
declare type SwitchConf<T extends IBase<T>> = {
    defaultCase: IFragment<T>;
    cases: Map<string, IFragment<T>>;
};
export default class Switch<T extends IBase<T>> extends Directive<T> {
    #private;
    constructor(node: Node, binding: IBinding<T>, scopes: Array<IScope>, { defaultCase, cases }: SwitchConf<T>);
    render(): Promise<void>;
}
export {};
//# sourceMappingURL=switch.d.ts.map