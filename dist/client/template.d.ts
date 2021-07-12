export declare type DirectiveMap = {
    [key: string]: Constructor<IDirective<any>>;
};
export declare const uuidRegex: RegExp;
export default class Template {
    private static _map;
    private static _directives;
    private static _plugins;
    private static readonly _directivesCache;
    private static readonly _templates;
    private static readonly _bindings;
    static initialize(map: {
        [key: string]: {
            [key: string]: NewBinding;
        };
    }, directives: DirectiveMap, plugins: Array<IPlugin>): Promise<void>;
    static hydrate<T extends IBase<T>>(scopes: Array<IScope>, fragment: IFragment<T>): Promise<ParsedTemplate<T>>;
    static render<T extends IBase<T>>(node: Node): Promise<void>;
    static mapFor(component: string): Map<string, NewBinding> | undefined;
    static getBindingsFor(node: Node): Array<IBinding<any>>;
    static processBindings<T extends IBase<T>>(bindings: Array<IBinding<T>>, scopes: Array<IScope>): Promise<void>;
    private static iterator;
}
//# sourceMappingURL=template.d.ts.map