import MagicString from 'magic-string';
declare type TypeMap<T> = {
    html: T;
    css: T;
    ts: T;
};
declare type Component = {
    namespace: string;
    files: TypeMap<string>;
};
declare type ComponentMap = {
    [key: string]: Component;
};
declare type Manifest = {
    name: string;
    dependencies: Array<Manifest>;
    components: ComponentMap;
    stylesheets: Array<[string, string]>;
};
export default class Composer {
    private readonly _context;
    constructor(context: Manifest);
    prepareHtml(code: string): Promise<MagicString>;
    static loadManifest(path: string): Promise<Manifest>;
    static from(path: string): Promise<Composer>;
}
export {};
//# sourceMappingURL=composer.d.ts.map