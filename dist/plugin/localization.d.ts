import Plugin from './plugin.js';
declare enum Language {
    Arabic = "ar-EG",
    German = "de-DE",
    English = "en-GB",
    French = "fr-FR",
    Dutch = "nl-NL"
}
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
    }): Promise<string | undefined>;
    get languages(): Array<Language>;
    get language(): Language;
    set language(language: Language);
    get key(): string;
    get plugin(): IPlugin;
    private _pluralization;
    private _getTranslation;
    private _rerender;
}
export {};
//# sourceMappingURL=localization.d.ts.map