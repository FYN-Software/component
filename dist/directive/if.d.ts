import Directive from './directive.js';
declare type IfConf = {
    fragment: IFragment;
};
export default class If<T extends IBase<T>> extends Directive<T> {
    private readonly _fragment;
    private readonly _initialized;
    constructor(owner: IBase<T>, scope: IScope<T>, node: Element, binding: IBinding<T>, { fragment }: IfConf);
    private _initialize;
    render(): Promise<void>;
}
export {};
//# sourceMappingURL=if.d.ts.map