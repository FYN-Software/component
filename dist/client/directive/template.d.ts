import Directive from './directive.js';
export default class Template<T extends IBase<T>> extends Directive<T> {
    private readonly _fragment;
    private readonly _initialized;
    constructor(node: Node, binding: IBinding<T>, scopes: Array<IScope>, { fragment }: {
        fragment: IFragment<T>;
    });
    private _initialize;
    render(): Promise<void>;
}
//# sourceMappingURL=template.d.ts.map