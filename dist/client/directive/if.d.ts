import Directive from './directive.js';
declare type IfConf<T extends IBase<T>> = {
    fragment: IFragment<T>;
};
export default class If<T extends IBase<T>> extends Directive<T> {
    private readonly _fragment;
    private readonly _initialized;
    constructor(node: Element, binding: IBinding<T>, scopes: Array<IScope>, { fragment }: IfConf<T>);
    private _initialize;
    render(): Promise<void>;
}
export {};
//# sourceMappingURL=if.d.ts.map