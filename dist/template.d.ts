export declare const regex: RegExp;
export declare const uuidRegex: RegExp;
export default class Template {
    private static _directives;
    private static _templates;
    private static _bindings;
    private static _cache;
    static cache(fragment: DocumentFragment, allowedKeys: Array<string>): Promise<CacheItem>;
    static deserialize({ html, map }: CacheItem): Promise<FragmentConfig>;
    static scan(fragment: DocumentFragment, allowedKeys: Array<string>): Promise<IFragment<any>>;
    static scanSlot(slot: HTMLSlotElement, allowedKeys: Array<string>, clone?: boolean): Promise<IFragment<any>>;
    static parseHtml<T extends IBase<T>>(owner: IBase<T>, scope: IScope<T>, fragment: IFragment<T>, properties: object): Promise<ParsedTemplate<T>>;
    static render<T extends IBase<T>>(node: Node): Promise<void>;
    static getDirectivesFor(node: Node): IDirectiveMap | undefined;
    static getDirective<TDirective extends IDirective<T>, T extends IBase<T>>(ctor: DirectiveConstructor<T>, node: Node): TDirective | undefined;
    static getBindingsFor(node: Node): Array<IBinding<any>>;
    static asSandboxedCallable(keys: Array<string>, code: string): AsyncFunction;
    static asSandboxedCodeString(keys: Array<string>, variable: string): string;
    private static iterator;
    private static uuid;
    private static createFingerprint;
}
//# sourceMappingURL=template.d.ts.map