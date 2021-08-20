declare type Directive = {
    type: string;
    [key: string]: any;
};

declare type Binding = {
    callable: AsyncFunction;
    directive?: Directive;
};

declare type TemplateMapItem = {
    [key: string]: Binding;
};

declare type TemplateMap = {
    __root__: TemplateMapItem;
    [key: string]: TemplateMapItem;
};

declare module 'template:*' {
    const map: TemplateMap;
    export default map;
}

type ViewModelFieldEvents<T> = { changed: { old: T, new: T } };
declare interface ViewModelField<T> extends CustomTarget<ViewModelField<T>, ViewModelFieldEvents<T>>
{
    readonly value: T|undefined;
    setValue(value: T|undefined): Promise<void>;
}

type ViewModelEvents<T> = { changed: { property: string, old: T[keyof T], new: T[keyof T] } };
declare type ViewModel<T extends IBase<T>> = CustomTarget<ViewModel<T>, ViewModelEvents<T>> & {
    [Key in keyof T]: ViewModelField<T[Key]>;
};

declare type ViewModelArgs<T extends IBase<T, T['events']>> = {
    [Key in keyof T]?: T[Key];
};

declare type IPluginContainer<TPlugins = {}> = {
    [Key in keyof TPlugins]: TPlugins[Key]
} & {
    keys: Array<string>;
    values: Array<IPlugin>;
    entries: Array<[ string, IPlugin ]>;
}

declare interface IPlugin extends EventTarget
{
    key: string;
    plugin: any;
    bindings: Array<{ binding: IBinding<any>, scopes: Array<IScope> }>;
}

declare interface ParsedTemplate<T extends IBase<T, T['events']>>
{
    template: Node;
    bindings: Array<IBinding<T>>;
}

declare type Setter<T extends IBase<T>> = (this: T, value: any) => T[keyof T];

declare type PropertyConfig<T extends IBase<T>> = {
    aliasFor?: keyof T;
    set?: Setter<T>;
    bindToCSS?: (value: T[keyof T]) => string;
};

declare type ElementResult = {
    type: 'element';
    location: any,
    node: Node;
    id: string;
};

declare type TemplateResult = {
    type: 'template';
    location: any,
    node: Node;
    keys?: Array<string>;
    id: string;
};

declare type VariableResult = {
    type: 'variable';
    location: any,
    node: Node;
    value: string;
    matches: Map<string, CachedBinding>;
    directive?: DirectiveConstructor;
};

declare type Result = ElementResult|TemplateResult|VariableResult;

declare interface ITemplate
{
}

declare interface TemplateConstructor extends Constructor<ITemplate>
{
    scan(dom: JSDOM): AsyncGenerator<{ type: Result['type'], node: Node }, void>;
    parse(dom: JSDOM, allowedKeys: Array<string>): AsyncGenerator<Result, void>;
}

declare interface IBase<T extends IBase<T, T['events']>, TEvents extends EventDefinition = {}> extends Target<TEvents>, IScope<T>
{
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, oldValue: any, newValue: any): void;

    cloneNode(deep?: boolean): IBase<T, T['events']>;

    observe(observers: ObserverConfig<T>): IBase<T, T['events']>;

    readonly shadow: CustomShadowRoot;
}

declare interface BaseConstructor<T extends IBase<T, T['events']>> extends Constructor<IBase<T, T['events']>>
{
    new(args?: ViewModelArgs<T>): IBase<T>;
    readonly properties: Array<string>;
    readonly observedAttributes: Array<string>;

    registerProperty(target: BaseConstructor<T>, key: keyof T, options?: PropertyConfig<T>): void
}

declare interface IComponent<T extends IComponent<T>> extends IBase<T, T['events']>
{
    readonly isReady: Promise<void>;
}

declare type AnimationConfigOptions = KeyframeAnimationOptions & { extend?: string };
declare type AnimationConfigArg = [ Array<Keyframe>, AnimationConfigOptions ];
declare type AnimationConfig = {
    [key: string]: AnimationConfigArg
};

declare interface ComponentConstructor<T extends IBase<T, T['events']>> extends BaseConstructor<T>
{
    readonly is: string;
    readonly styles: Array<string>;
    readonly animations: AnimationConfig;
    init(): Promise<ComponentConstructor<T>>
}

declare interface IFragment<T extends IBase<T, T['events']>>
{
    clone(): IFragment<T>;

    template: Node;
    map: Map<string, Binding>;
}
declare interface FragmentConstructor
{
    new<T extends IBase<T>>(template: DocumentFragment, map: BindingLikeMap<T>): IFragment<T>;
}

declare interface IDirective<T extends IBase<T>>
{
    readonly node: Node;
    render(): Promise<void>;
}

declare interface IDirectiveMap
{
    [key: string]: IDirective<any>
}

declare type DirectiveParseResult = {
    node: Node;
    keys?: Array<string>;
};

interface DirectiveConstructor extends Constructor<any>
{
    parse(template: TemplateConstructor, binding: CachedBinding, node: Attr): Promise<DirectiveParseResult>
}

declare type Observer<T = any> = (oldValue: T, newValue: T) => any;
declare type ObserverConfig<T extends IBase<T>> = {
    [Key in keyof T]?: Observer<T[Key]>;
};

declare interface IScope<T extends IBase<T> = any>
{
    readonly properties: ViewModel<T>
}

declare interface IBindingMap<T extends IBase<T>> extends Map<string, IBinding<T>>
{

}

declare interface IBinding<T extends IBase<T>>
{
    readonly tag: string;
    readonly keys: Array<string>;
    readonly code: string;
    readonly nodes: Set<Node>;
    readonly value: Promise<any>;
    resolve(scopes: Array<IScope>, plugins: IPluginContainer): Promise<any>;
}
declare interface BindingConstructor<T extends IBase<T>> extends Constructor<IBinding<T>>
{
    new(tag: string, callable: AsyncFunction): IBinding<T>;
}

declare interface BindingLikeMap<T> extends Map<string, BindingLike<T>>
{

}

declare interface BindingLike<T>
{
    callable: AsyncFunction;
    original: string;
    code: string;
    keys: Array<keyof T>;
    directive?: DirectiveCache;
}

type DirectiveCache = {
    type: string;
    keys?: Array<string>;
    [key: string]: any;
};

type CachedBinding = {
    callable: {
        args: Array<string>
        code: string,
    };
    directive?: DirectiveCache;
};

type CacheItem = {
    id?: string;
    html: Node;
    map: Map<string, CachedBinding>;
};

type FragmentConfig = {
    html: DocumentFragment,
    map: Map<string, BindingLike<any>>;
};

type FragmentLike = {
    html: string,
    map: BindingLikeMap<any>;
};

type PluginCollection = Array<IPlugin> | {
    keys(): Array<string>;
    values(): Array<any>;
    entries(): Array<[ string, IPlugin ]>;
};

interface CustomShadowRoot extends ShadowRoot
{
    readonly style: CSSStyleDeclaration;
    getPropertyValue(property: string): any;
    setProperty(property: string, value: any, priority?: string): void;
}

declare var AsyncFunction: AsyncFunctionConstructor;