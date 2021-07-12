import Directive from './directive.js';
export default class For<T extends IBase<T>> extends Directive<T> {
    static scan(id: string, node: Attr, map: Map<string, any>): Promise<void>;
}
//# sourceMappingURL=for.d.ts.map