import Directive from './directive.js';
declare type ForConf<T extends IBase<T>> = {
    fragments: {
        [key: string]: IFragment<T>;
    };
    name?: string;
    key?: string;
};
declare type ForEvents = {
    rendered: void;
    templateChange: IFragment<any>;
};
export default class For<T extends IBase<T> = any> extends Directive<T, ForEvents> {
    #private;
    constructor(node: Node, binding: IBinding<T>, scopes: Array<IScope>, { fragments, name, key }: ForConf<T>);
    get fragment(): IFragment<T>;
    set fragment(fragment: IFragment<T>);
    render(): Promise<void>;
}
export {};
//# sourceMappingURL=for.d.ts.map