import Plugin from './plugin.js';
export default class Localization extends Plugin {
    _resources: {
        'ar-EG': {
            common: Promise<any>;
            data: Promise<any>;
        };
        'de-DE': {
            common: Promise<any>;
            data: Promise<any>;
        };
        'en-GB': {
            common: Promise<any>;
            data: Promise<any>;
            site: Promise<any>;
            dash: Promise<any>;
            shell: Promise<any>;
        };
        'fr-FR': {
            common: Promise<any>;
            data: Promise<any>;
        };
        'nl-NL': {
            common: Promise<any>;
            data: Promise<any>;
            site: Promise<any>;
            dash: Promise<any>;
            shell: Promise<any>;
        };
    };
    _formatters: {
        default: Formatter;
        relativeDateTime: RelativeDateTime;
        dateTime: DateTime;
        currency: NumberFormatter;
        percent: NumberFormatter;
    };
    _global: any;
    _fallback: string;
    _namespace: string[];
    _cache: Map<any, any>;
    constructor();
    t(key: any, replacements?: {}): Promise<any>;
    get languages(): string[];
    get language(): any;
    set language(language: any);
    get key(): string;
    get plugin(): any;
    _pluralization(language: any, value: any): any;
    _getTranslation(path: any, language: any): any;
    _rerender(): Promise<void>;
}
declare class Formatter {
    _language: string;
    set language(language: string);
    get language(): string;
    format(value: any): any;
}
declare class NumberFormatter extends Formatter {
    _cache: Map<any, any>;
    _conf: {
        notation: string;
    };
    constructor(conf?: object);
    set language(language: string);
    get language(): string;
    format(value: any): any;
}
declare class RelativeDateTime extends Formatter {
    _units: {
        year: number;
        month: number;
        day: number;
        hour: number;
        minute: number;
        second: number;
    };
    _cache: Map<any, any>;
    set language(language: string);
    get language(): string;
    format(value: any): any;
}
declare class DateTime extends Formatter {
    _cache: Map<any, any>;
    set language(language: string);
    get language(): string;
    format(value: any): any;
}
export {};
//# sourceMappingURL=localization.d.ts.map