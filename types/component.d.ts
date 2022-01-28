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

declare type ViewModelArgs<T extends IBase<T, EventsType<T>>> = {
    [Key in keyof T]?: T[Key];
};

declare type IPluginContainer<TPlugins extends { [key:string]: IPlugin } = {}> = {
    [Key in keyof TPlugins]: TPlugins[Key]
} & {
    plugins: TPlugins;
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

declare interface ParsedTemplate<T extends IBase<T, EventsType<T>>>
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
    processBindings<T extends IBase<T>>(bindings: Array<IBinding<T>>, scopes: Array<IScope>): Promise<void>;
}

declare interface IBase<T extends IBase<T, TEvents>, TEvents extends EventDefinition = {}> extends Target<TEvents>, IScope<T>
{
    attributeChangedCallback(name: string, oldValue: any, newValue: any): void;

    observe(observers: ObserverConfig<T>): IBase<T, TEvents>;

    readonly shadow: CustomShadowRoot;
    readonly viewModel: IObservable<T>;
}

declare interface BaseConstructor<T extends IBase<T, EventsType<T>>> extends Constructor<IBase<T, EventsType<T>>>
{
    new(args?: ViewModelArgs<T>): IBase<T>;
    readonly properties: Array<string>;
    readonly observedAttributes: Array<string>;

    registerProperty(target: BaseConstructor<T>, key: keyof T, options?: PropertyConfig<T>): void
}

declare interface IComponent<T extends IComponent<T>> extends IBase<T, EventsType<T>>
{
}

declare type AnimationConfigOptions = KeyframeAnimationOptions & { extend?: string };
declare type AnimationConfigArg = [ Array<Keyframe>, AnimationConfigOptions ];
declare type AnimationConfig = {
    [key: string]: AnimationConfigArg
};

declare interface ComponentConstructor<T extends IBase<T, EventsType<T>>> extends BaseConstructor<T>
{
    readonly is: string;
    readonly styles: Array<string>;
    readonly animations: AnimationConfig;
    init(): Promise<ComponentConstructor<T>>
}

declare interface IFragment<T extends IBase<T, EventsType<T>>>
{
    clone(): IFragment<T>;

    template: Node;
    map: Map<string, Binding>;
}

declare interface IDirective<T extends IBase<T>, TEvents extends EventDefinition = {}> extends CustomTarget<IDirective<T, TEvents>, TEvents>
{
    readonly node: Node;
    render(): Promise<void>;
}

declare type DirectiveParseResult = {
    node: Node;
    keys?: Array<string>;
};

interface DirectiveConstructor extends Constructor<any>
{
    parse(binding: CachedBinding, node: Attr): Promise<DirectiveParseResult>
}

declare type Observer<T = any> = (oldValue: T, newValue: T) => any;
declare type ObserverConfig<T extends IBase<T, EventsType<T>>> = {
    [Key in keyof Omit<T, keyof IBase<T, EventsType<T>>>]?: Observer<T[Key]>;
};

declare interface IScope<T = any>
{
    readonly properties: T
}

declare interface IBinding<T extends IBase<T>>
{
    readonly tag: string;
    readonly keys: Array<string>;
    readonly nodes: Set<Node>;
    readonly value: Promise<any>;
    resolve(scopes: Array<IScope>, plugins: IPluginContainer): Promise<any>;
}
declare interface BindingConstructor<T extends IBase<T>> extends Constructor<IBinding<T>>
{
    new(tag: string, callable: AsyncFunction): IBinding<T>;
}

type DirectiveCache = {
    type: string;
    keys?: Array<string>;
    fragments: Map<string, string>,
    [key: string]: any;
};

type CachedBinding = {
    callable: {
        args: Array<string>
        code: string,
    };
    directive?: DirectiveCache;
};

interface CustomShadowRoot extends ShadowRoot
{
    readonly style: CSSStyleDeclaration;
    getPropertyValue(property: string): any;
    setProperty(property: string, value: any, priority?: string): void;
}

declare var AsyncFunction: AsyncFunctionConstructor;