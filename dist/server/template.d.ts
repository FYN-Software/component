import '../../../core/dist/extends.js';
import { JSDOM } from 'jsdom';
export declare const regex: RegExp;
export declare const uuidRegex: RegExp;
declare type ElementResult = {
    type: 'element';
    location: any;
    node: Node;
    id: string;
};
declare type TemplateResult = {
    type: 'template';
    location: any;
    node: Node;
    id: string;
};
declare type VariableResult = {
    type: 'variable';
    location: any;
    node: Node;
    value: string;
    matches: Map<string, CachedBinding>;
    directive?: DirectiveConstructor;
};
declare type Result = ElementResult | TemplateResult | VariableResult;
export default class Template {
    static scan(dom: JSDOM): AsyncGenerator<{
        type: Result['type'];
        node: Node;
    }, void>;
    static parse(dom: JSDOM, allowedKeys: Array<string>): AsyncGenerator<Result, void>;
    static get uuidRegex(): RegExp;
    private static iterator;
    private static uuid;
    private static createFingerprint;
}
export {};
//# sourceMappingURL=template.d.ts.map