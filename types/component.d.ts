declare interface ViewModelField<T> extends EventTarget
{
    readonly value: T|undefined;
    setValue(value: T|undefined): Promise<void>;
}

declare type ViewModel<T extends IBase<T>> = EventTarget & {
    [Key in keyof T]: ViewModelField<T[Key]>;
};

declare type ViewModelArgs<T extends IBase<T>> = {
    [Key in keyof T]?: T[Key];
};

declare interface IPlugin extends EventTarget
{
    key: string;
    plugin: any;
    bindings: Array<{ binding: IBinding<any>, scopes: Array<IScope> }>;
}

declare interface ParsedTemplate<T extends IBase<T>>
{
    template: Node;
    bindings: Array<IBinding<T>>;
}

declare type Setter<T extends IBase<T>> = (this: IBase<T>, value: any) => T[keyof T];

declare type PropertyConfig<T extends IBase<T>> = {
    aliasFor?: keyof T;
    set?: Setter<T>;
    bindToCSS?: (value: T[keyof T]) => string;
};

declare interface IBase<T extends IBase<T>> extends HTMLElement, IScope<T>
{
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, oldValue: any, newValue: any): void;

    cloneNode(deep?: boolean): IBase<T>;

    observe(observers: ObserverConfig<T>): IBase<T>;
}

declare interface BaseConstructor<T extends IBase<T>> extends Constructor<IBase<T>>
{
    new(args?: ViewModelArgs<T>): IBase<T>;
    readonly properties: Array<string>;
    readonly observedAttributes: Array<string>;

    registerProperty<T extends IBase<T>>(target: BaseConstructor<T>, key: keyof T, options?: PropertyConfig<T>): void
}

declare interface IComponent<T extends IComponent<T>> extends IBase<T>
{
    readonly isReady: Promise<void>;
}

declare type AnimationConfigOptions = KeyframeAnimationOptions & { extend?: string };
declare type AnimationConfigArg = [ Array<Keyframe>, AnimationConfigOptions ];
declare type AnimationConfig = {
    [key: string]: AnimationConfigArg
};

declare interface ComponentConstructor<T extends IBase<T>> extends BaseConstructor<T>
{
    readonly is: string;
    readonly styles: Array<string>;
    readonly animations: AnimationConfig;
    init(): Promise<ComponentConstructor<T>>
}

declare interface IFragment<T extends IBase<T>>
{
    clone(): IFragment<T>;

    template: Node;
    map: Map<string, NewBinding>;
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

interface DirectiveConstructor extends Constructor<any>
{
    scan(id: string, node: Attr, map: Map<string, any>): Promise<void>
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
    resolve(scopes: Array<IScope>): Promise<any>;
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
    [key: string]: any;
};

type NewBinding = {
    callable: AsyncFunction;
    directive?: DirectiveCache;
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

declare type RootElement = Element|DocumentFragment;

interface ITemplate
{
    scan(fragment: RootElement, allowedKeys: Array<string>): Promise<CacheItem>;
    uuidRegex: RegExp;
}

declare var AsyncFunction: AsyncFunctionConstructor;