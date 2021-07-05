export declare const uuidRegex: RegExp;
export default class Template {
    private static _directives;
    private static _directivesCache;
    private static _templates;
    private static _bindings;
    private static _map;
    static initialize(map: {
        [key: string]: {
            [key: string]: NewBinding;
        };
    }): Promise<void>;
    static hydrate<T extends IBase<T>>(scopes: Array<IScope>, fragment: IFragment<T>): Promise<ParsedTemplate<T>>;
    static render<T extends IBase<T>>(node: Node): Promise<void>;
    static mapFor(component: string): Map<string, NewBinding> | undefined;
    static getDirective<TDirective extends IDirective<T>, T extends IBase<T>>(ctor: DirectiveConstructor<T>, node: Node): TDirective | undefined;
    static getBindingsFor(node: Node): Array<IBinding<any>>;
    static processBindings<T extends IBase<T>>(bindings: Array<IBinding<T>>, scopes: Array<IScope>): Promise<void>;
    private static iterator;
}
//# sourceMappingURL=template.d.ts.map