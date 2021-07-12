import Directive from './directive.js';
export default class Switch<T extends IBase<T>> extends Directive<T> {
    static scan(id: string, node: Attr, map: Map<string, any>): Promise<void>;
}
//# sourceMappingURL=switch.d.ts.map