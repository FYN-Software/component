import Plugin from './plugin.js';
export default class Localization extends Plugin {
    private _resources;
    private _formatters;
    private _global;
    private _fallback;
    private _namespace;
    private _cache;
    constructor();
    t(key: string, replacements?: {
        [key: string]: any;
    }): Promise<any>;
    get languages(): Array<string>;
    get language(): string;
    set language(language: string);
    get key(): string;
    get plugin(): any;
    _pluralization(language: any, value: any): any;
    _getTranslation(path: any, language: any): any;
    _rerender(): Promise<void>;
}
//# sourceMappingURL=localization.d.ts.map