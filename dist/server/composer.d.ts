import MagicString from 'magic-string';
declare type TypeMap<T extends Promise<string> | string = string> = {
    html: T;
    css: T;
    ts: T;
    import: T;
};
declare type Component = {
    id: string;
    namespace: string;
    module?: string;
    meta?: {
        name: string;
        styles: Array<string>;
        properties: Array<string>;
    };
    resources: Partial<TypeMap<Promise<string>>>;
    files: TypeMap;
};
export declare type ComponentMap = {
    [key: string]: Component;
};
declare type Manifest = {
    name: string;
    dependencies: Array<Manifest>;
    components: ComponentMap;
    stylesheets: Array<[string, string]>;
};
export declare type HtmlResult = {
    code: MagicString;
    map: Map<string, Map<string, CachedBinding>>;
    imports: ComponentMap;
    templates: Set<string>;
};
export default class Composer {
    private readonly _context;
    constructor(context: Promise<Manifest>);
    get components(): Promise<ComponentMap>;
    resolve(id: string): Promise<Component | undefined>;
    loadResource(name: string, type: keyof TypeMap): Promise<string | undefined>;
    scanHtml(code: string): Promise<ComponentMap>;
    parseHtml(code: string, allowedKeys?: Array<string>): Promise<HtmlResult>;
    static loadManifest(path: string): Promise<Manifest>;
    static from(path: string): Composer;
}
export {};
//# sourceMappingURL=composer.d.ts.map