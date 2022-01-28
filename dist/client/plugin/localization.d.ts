import Plugin from './plugin.js';
export declare enum Language {
    Arabic = "ar-EG",
    German = "de-DE",
    English = "en-GB",
    French = "fr-FR",
    Dutch = "nl-NL"
}
export default class Localization extends Plugin {
    #private;
    constructor(processBindings: ITemplate['processBindings'], defaultLanguage: Language);
    t(key: string, replacements?: {
        [key: string]: any;
    }): Promise<string | undefined>;
    get languages(): Array<Language>;
    get language(): Language;
    set language(language: Language);
    get locale(): Intl.Locale;
    get key(): string;
    get plugin(): IPlugin;
}
//# sourceMappingURL=localization.d.ts.map