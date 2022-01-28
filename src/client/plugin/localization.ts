import Plugin from './plugin.js';

export enum Language
{
    Arabic = 'ar-EG',
    German = 'de-DE',
    English = 'en-GB',
    French = 'fr-FR',
    Dutch = 'nl-NL',
}
type Translation = {
    pluralRulesValue: string
    one: string
}&{
    [K in Intl.LDMLPluralRule]?: string;
};
type Namespace = {
    [key: string]: Promise<Namespace|Translation>
};
type Resources = {
    [K in Language]: Namespace;
};

export default class Localization extends Plugin
{
    #locale!: Intl.Locale;
    #resources: Resources = {
        [Language.Arabic]: {
            common: fetch(`https://fyncdn.nl/locales/${Language.Arabic}/common.json`).then(r => r.json()),
            data: fetch(`https://fyncdn.nl/locales/${Language.Arabic}/data.json`).then(r => r.json()),
            shop: fetch(`https://fyncdn.nl/locales/${Language.Arabic}/shop.json`).then(r => r.json()),
        },
        [Language.German]: {
            common: fetch(`https://fyncdn.nl/locales/${Language.German}/common.json`).then(r => r.json()),
            data: fetch(`https://fyncdn.nl/locales/${Language.German}/data.json`).then(r => r.json()),
            // shop: fetch(`https://fyncdn.nl/locales/${Language.German}/shop.json`).then(r => r.json()),
        },
        [Language.English]: {
            common: fetch(`https://fyncdn.nl/locales/${Language.English}/common.json`).then(r => r.json()),
            data: fetch(`https://fyncdn.nl/locales/${Language.English}/data.json`).then(r => r.json()),
            shop: fetch(`https://fyncdn.nl/locales/${Language.English}/shop.json`).then(r => r.json()),
            kiosk: fetch(`https://fyncdn.nl/locales/${Language.English}/kiosk.json`).then(r => r.json()),
        },
        [Language.French]: {
            common: fetch(`https://fyncdn.nl/locales/${Language.French}/common.json`).then(r => r.json()),
            data: fetch(`https://fyncdn.nl/locales/${Language.French}/data.json`).then(r => r.json()),
            // shop: fetch(`https://fyncdn.nl/locales/${Language.French}/shop.json`).then(r => r.json()),
        },
        [Language.Dutch]: {
            common: fetch(`https://fyncdn.nl/locales/${Language.Dutch}/common.json`).then(r => r.json()),
            data: fetch(`https://fyncdn.nl/locales/${Language.Dutch}/data.json`).then(r => r.json()),
            shop: fetch(`https://fyncdn.nl/locales/${Language.Dutch}/shop.json`).then(r => r.json()),
            kiosk: fetch(`https://fyncdn.nl/locales/${Language.Dutch}/kiosk.json`).then(r => r.json()),
        },
    };
    #formatters: { [key: string]: Formatter } = {
        default: new Formatter(),
        relativeDateTime: new RelativeDateTime(),
        dateTime: new DateTime(),
        currency: new NumberFormatter({ style: 'currency', currency: 'EUR' }),
        percent: new NumberFormatter({ style: 'percent', signDisplay: 'exceptZero' }),
    };
    #global!: Language;
    #namespace = [ 'common' ];
    #cache: Map<string, Intl.PluralRules> = new Map();
    readonly #processBindings: ITemplate['processBindings'];
    readonly #fallback: Language;

    constructor(processBindings: ITemplate['processBindings'], defaultLanguage: Language)
    {
        super();

        this.#processBindings = processBindings;
        this.#fallback = defaultLanguage;
        this.language = defaultLanguage;
    }

    async t(key: string, replacements: { [key: string]: any } = {}): Promise<string|undefined>
    {
        let path = key.split('.');

        if(path.length === 1)
        {
            path = [ ...this.#namespace, path[0] ];
        }

        const language: Language = replacements?._lang ?? this.#global;
        const translation: Translation = await this.#getTranslation(path, language);

        if(translation === undefined)
        {
            return replacements?._returnKey === true ? key : undefined;
        }

        const pluralRulesValue = replacements?.[translation.pluralRulesValue] ?? 1;
        let pluralization: Intl.LDMLPluralRule = this.#pluralization(language, pluralRulesValue);

        if(translation.hasOwnProperty(pluralization) === false)
        {
            pluralization = 'one';
        }

        return translation[pluralization]!.replace(/{{(?:#(?<type>[a-zA-Z]+)\s)?\s*(?<key>[a-zA-Z\-_]+)\s*}}/g, (...args: Array<any>) => {
            const { type = 'default', key }: { type: string, key: string } = args[5];
            const formatter = this.#formatters[type] ?? this.#formatters.default;

            return formatter.format(replacements[key] ?? '???');
        });
    }

    get languages(): Array<Language>
    {
        return Object.values(Language);
    }
    get language(): Language
    {
        return this.#global!;
    }

    set language(language: Language)
    {
        (async () => {
            if(language === this.#global)
            {
                return;
            }

            const old = this.#global;

            this.#global = language;
            this.#locale = new Intl.Locale(language);

            for(const formatter of Object.values(this.#formatters))
            {
                formatter.language = language;
            }

            await this.#rerender();

            this.emit('changed', { old, new: language });
        })();
    }

    get locale(): Intl.Locale
    {
        return this.#locale;
    }

    get key(): string
    {
        return 't';
    }

    get plugin(): IPlugin
    {
        const proxy = new Proxy(() => {}, {
            get: () => proxy,
            apply: (target, thisArg, [ key, options = {} ]) => this.t(key, options),
        }) as unknown as IPlugin;

        return proxy;
    }

    #pluralization(language: string, value: number): Intl.LDMLPluralRule
    {
        if(this.#cache.has(language) === false)
        {
            this.#cache.set(language, new Intl.PluralRules(language));
        }

        return this.#cache.get(language)!.select(value);
    }

    async #getTranslation(path: Array<string>, language: Language): Promise<Translation>
    {
        let translation: Namespace|Translation = await this.#resources[language];

        for(const k of path)
        {
            translation = await (translation as Namespace)[k];

            if(translation === undefined)
            {
                break;
            }
        }

        if(translation === undefined && language !== this.#fallback)
        {
            return this.#getTranslation(path, this.#fallback);
        }

        return translation as Translation;
    }

    async #rerender(): Promise<void>
    {
        await Promise.all(this.bindings.map(
            ({ binding, scopes }) => this.#processBindings([ binding ], scopes)
        ));
    }
}

class Formatter
{
    #language: string = 'en-GB';

    set language(language: string)
    {
        this.#language = language;
    }

    get language(): string
    {
        return this.#language;
    }

    format(value: any): string
    {
        return value;
    }
}

class NumberFormatter extends Formatter
{
    #cache: Map<string, Intl.NumberFormat> = new Map();
    readonly #conf: Intl.NumberFormatOptions = {
        notation: 'standard',
    };

    constructor(conf?: Intl.NumberFormatOptions)
    {
        super();

        if(conf !== undefined)
        {
            this.#conf = conf;
        }
    }

    set language(language: string)
    {
        if(this.#cache.has(language) === false)
        {
            this.#cache.set(language, new Intl.NumberFormat(language, this.#conf));
        }

        super.language = language;
    }

    get language(): string
    {
        return super.language;
    }

    format(value: number): string
    {
        return this.#cache.get(this.language)!.format(value);
    }
}

enum RelativeDateTimeUnits
{
    year   = 24 * 60 * 60 * 1000 * 365,
    month  = 24 * 60 * 60 * 1000 * 365/12,
    day    = 24 * 60 * 60 * 1000,
    hour   = 60 * 60 * 1000,
    minute = 60 * 1000,
    second = 1000,
}

class RelativeDateTime extends Formatter
{
    #cache: Map<string, Intl.RelativeTimeFormat> = new Map();

    set language(language: string)
    {
        if(this.#cache.has(language) === false)
        {
            this.#cache.set(language, new Intl.RelativeTimeFormat(language, { numeric: 'auto' }));
        }

        super.language = language;
    }

    get language(): string
    {
        return super.language;
    }

    format(value: number): string
    {
        const elapsed = value - Date.now();

        // "Math.abs" accounts for both "past" & "future" scenarios
        for (const [ unit, milliseconds ] of Object.entries(RelativeDateTimeUnits))
        {
            if (Math.abs(elapsed) > milliseconds || unit === 'second')
            {
                return this.#cache.get(this.language)!.format(
                    Math.round(elapsed / (milliseconds as number)),
                    unit as Intl.RelativeTimeFormatUnit
                );
            }
        }

        return '';
    }
}

class DateTime extends Formatter
{
    #cache: Map<string, Intl.DateTimeFormat> = new Map();

    set language(language: string)
    {
        if(this.#cache.has(language) === false)
        {
            this.#cache.set(language, new Intl.DateTimeFormat(language));
        }

        super.language = language;
    }

    get language(): string
    {
        return super.language;
    }

    format(value: number|Date): string
    {
        return this.#cache.get(this.language)!.format(value);
    }
}