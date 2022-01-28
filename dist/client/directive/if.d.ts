import Directive from './directive.js';
declare type IfConf<T extends IBase<T>> = {
    fragments: {
        [key: string]: IFragment<T>;
    };
};
export default class If<T extends IBase<T>> extends Directive<T> {
    #private;
    constructor(node: Element, binding: IBinding<T>, scopes: Array<IScope>, { fragments }: IfConf<T>);
    render(): Promise<void>;
}
export {};
//# sourceMappingURL=if.d.ts.map