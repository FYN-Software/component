import MagicString from 'magic-string';
declare type TypeMap<T extends Promise<string> | string = string> = {
    html: T;
    css: T;
    ts: T;
    import: T;
};
export declare type MetaData = {
    name: string;
    styles: Array<string>;
    properties: Array<string>;
};
declare type Component = {
    id: string;
    namespace: string;
    module?: string;
    meta?: MetaData;
    resources: Partial<TypeMap<Promise<string>>>;
    files: TypeMap;
};
export declare type ComponentMap = {
    [key: string]: Component;
};
export declare type StylesheetsMap = {
    [key: string]: string;
};
declare type Manifest = {
    name: string;
    theme?: string;
    dependencies: Array<Manifest>;
    components: ComponentMap;
    stylesheets: StylesheetsMap;
};
export declare type HtmlResult = {
    code: MagicString;
    map: Map<string, Map<string, CachedBinding>>;
    imports: ComponentMap;
    templates: Map<string, MagicString>;
};
export default class Composer {
    private readonly _context;
    private readonly _cache;
    constructor(context: Promise<Manifest>);
    get components(): Promise<ComponentMap>;
    get stylesheets(): Promise<StylesheetsMap>;
    resolve(id: string): Promise<Component | undefined>;
    loadResource(name: string, type: keyof TypeMap): Promise<string | undefined>;
    scanHtml(code: string): Promise<ComponentMap>;
    parseHtml(code: string, allowedKeys?: Array<string>): Promise<HtmlResult>;
    static loadManifest(path: string): Promise<Manifest>;
    static from(path: string): Composer;
}
export {};
//# sourceMappingURL=composer.d.ts.map