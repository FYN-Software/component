import '../../../core/dist/extends.js';
import { JSDOM } from 'jsdom';
export declare const regex: RegExp;
export declare const uuidRegex: RegExp;
export default class Template {
    private static toExtract;
    static scan(dom: JSDOM): AsyncGenerator<{
        type: Result['type'];
        node: Node;
    }, void>;
    static parse(dom: JSDOM, allowedKeys: Array<string>): AsyncGenerator<Result, void>;
    static get uuidRegex(): RegExp;
    private static iterator;
    static uuid(): string;
    private static createFingerprint;
}
//# sourceMappingURL=template.d.ts.map