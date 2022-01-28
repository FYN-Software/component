import LocalizationPlugin from './plugin/localization.js';
export declare type DirectiveMap = {
    [key: string]: Constructor<IDirective<any>>;
};
export declare const uuidRegex: RegExp;
export declare function initialize(map: {
    [key: string]: {
        [key: string]: Binding;
    };
}, directives: DirectiveMap): Promise<void>;
export declare function hydrate<T extends IBase<T>>(scopes: Array<IScope>, fragment: IFragment<T>): Promise<ParsedTemplate<T>>;
export declare function render<T extends IBase<T>>(node: Node): Promise<void>;
export declare function mapFor(component: string): Map<string, Binding> | undefined;
export declare function getDirective<TDirective extends IDirective<any>>(ctor: Constructor<IDirective<any>>, node: Node): TDirective | undefined;
export declare function getBindingsFor(node: Node): Array<IBinding<any>>;
export declare function processBindings<T extends IBase<T>>(bindings: Array<IBinding<T>>, scopes: Array<IScope>): Promise<void>;
export declare const plugins: IPluginContainer<{
    localization: LocalizationPlugin;
}>;
//# sourceMappingURL=template.d.ts.map