import Plugin from './plugin.js';
export var Language;
(function (Language) {
    Language["Arabic"] = "ar-EG";
    Language["German"] = "de-DE";
    Language["English"] = "en-GB";
    Language["French"] = "fr-FR";
    Language["Dutch"] = "nl-NL";
})(Language || (Language = {}));
export default class Localization extends Plugin {
    #locale;
    #resources = {
        [Language.Arabic]: {
            common: fetch(`https://fyncdn.nl/locales/${Language.Arabic}/common.json`).then(r => r.json()),
            data: fetch(`https://fyncdn.nl/locales/${Language.Arabic}/data.json`).then(r => r.json()),
            shop: fetch(`https://fyncdn.nl/locales/${Language.Arabic}/shop.json`).then(r => r.json()),
        },
        [Language.German]: {
            common: fetch(`https://fyncdn.nl/locales/${Language.German}/common.json`).then(r => r.json()),
            data: fetch(`https://fyncdn.nl/locales/${Language.German}/data.json`).then(r => r.json()),
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
        },
        [Language.Dutch]: {
            common: fetch(`https://fyncdn.nl/locales/${Language.Dutch}/common.json`).then(r => r.json()),
            data: fetch(`https://fyncdn.nl/locales/${Language.Dutch}/data.json`).then(r => r.json()),
            shop: fetch(`https://fyncdn.nl/locales/${Language.Dutch}/shop.json`).then(r => r.json()),
            kiosk: fetch(`https://fyncdn.nl/locales/${Language.Dutch}/kiosk.json`).then(r => r.json()),
        },
    };
    #formatters = {
        default: new Formatter(),
        relativeDateTime: new RelativeDateTime(),
        dateTime: new DateTime(),
        currency: new NumberFormatter({ style: 'currency', currency: 'EUR' }),
        percent: new NumberFormatter({ style: 'percent', signDisplay: 'exceptZero' }),
    };
    #global;
    #namespace = ['common'];
    #cache = new Map();
    #processBindings;
    #fallback;
    constructor(processBindings, defaultLanguage) {
        super();
        this.#processBindings = processBindings;
        this.#fallback = defaultLanguage;
        this.language = defaultLanguage;
    }
    async t(key, replacements = {}) {
        let path = key.split('.');
        if (path.length === 1) {
            path = [...this.#namespace, path[0]];
        }
        const language = replacements?._lang ?? this.#global;
        const translation = await this.#getTranslation(path, language);
        if (translation === undefined) {
            return replacements?._returnKey === true ? key : undefined;
        }
        const pluralRulesValue = replacements?.[translation.pluralRulesValue] ?? 1;
        let pluralization = this.#pluralization(language, pluralRulesValue);
        if (translation.hasOwnProperty(pluralization) === false) {
            pluralization = 'one';
        }
        return translation[pluralization].replace(/{{(?:#(?<type>[a-zA-Z]+)\s)?\s*(?<key>[a-zA-Z\-_]+)\s*}}/g, (...args) => {
            const { type = 'default', key } = args[5];
            const formatter = this.#formatters[type] ?? this.#formatters.default;
            return formatter.format(replacements[key] ?? '???');
        });
    }
    get languages() {
        return Object.values(Language);
    }
    get language() {
        return this.#global;
    }
    set language(language) {
        (async () => {
            if (language === this.#global) {
                return;
            }
            const old = this.#global;
            this.#global = language;
            this.#locale = new Intl.Locale(language);
            for (const formatter of Object.values(this.#formatters)) {
                formatter.language = language;
            }
            await this.#rerender();
            this.emit('changed', { old, new: language });
        })();
    }
    get locale() {
        return this.#locale;
    }
    get key() {
        return 't';
    }
    get plugin() {
        const proxy = new Proxy(() => { }, {
            get: () => proxy,
            apply: (target, thisArg, [key, options = {}]) => this.t(key, options),
        });
        return proxy;
    }
    #pluralization(language, value) {
        if (this.#cache.has(language) === false) {
            this.#cache.set(language, new Intl.PluralRules(language));
        }
        return this.#cache.get(language).select(value);
    }
    async #getTranslation(path, language) {
        let translation = await this.#resources[language];
        for (const k of path) {
            translation = await translation[k];
            if (translation === undefined) {
                break;
            }
        }
        if (translation === undefined && language !== this.#fallback) {
            return this.#getTranslation(path, this.#fallback);
        }
        return translation;
    }
    async #rerender() {
        await Promise.all(this.bindings.map(({ binding, scopes }) => this.#processBindings([binding], scopes)));
    }
}
class Formatter {
    #language = 'en-GB';
    set language(language) {
        this.#language = language;
    }
    get language() {
        return this.#language;
    }
    format(value) {
        return value;
    }
}
class NumberFormatter extends Formatter {
    #cache = new Map();
    #conf = {
        notation: 'standard',
    };
    constructor(conf) {
        super();
        if (conf !== undefined) {
            this.#conf = conf;
        }
    }
    set language(language) {
        if (this.#cache.has(language) === false) {
            this.#cache.set(language, new Intl.NumberFormat(language, this.#conf));
        }
        super.language = language;
    }
    get language() {
        return super.language;
    }
    format(value) {
        return this.#cache.get(this.language).format(value);
    }
}
var RelativeDateTimeUnits;
(function (RelativeDateTimeUnits) {
    RelativeDateTimeUnits[RelativeDateTimeUnits["year"] = 31536000000] = "year";
    RelativeDateTimeUnits[RelativeDateTimeUnits["month"] = 2628000000] = "month";
    RelativeDateTimeUnits[RelativeDateTimeUnits["day"] = 86400000] = "day";
    RelativeDateTimeUnits[RelativeDateTimeUnits["hour"] = 3600000] = "hour";
    RelativeDateTimeUnits[RelativeDateTimeUnits["minute"] = 60000] = "minute";
    RelativeDateTimeUnits[RelativeDateTimeUnits["second"] = 1000] = "second";
})(RelativeDateTimeUnits || (RelativeDateTimeUnits = {}));
class RelativeDateTime extends Formatter {
    #cache = new Map();
    set language(language) {
        if (this.#cache.has(language) === false) {
            this.#cache.set(language, new Intl.RelativeTimeFormat(language, { numeric: 'auto' }));
        }
        super.language = language;
    }
    get language() {
        return super.language;
    }
    format(value) {
        const elapsed = value - Date.now();
        for (const [unit, milliseconds] of Object.entries(RelativeDateTimeUnits)) {
            if (Math.abs(elapsed) > milliseconds || unit === 'second') {
                return this.#cache.get(this.language).format(Math.round(elapsed / milliseconds), unit);
            }
        }
        return '';
    }
}
class DateTime extends Formatter {
    #cache = new Map();
    set language(language) {
        if (this.#cache.has(language) === false) {
            this.#cache.set(language, new Intl.DateTimeFormat(language));
        }
        super.language = language;
    }
    get language() {
        return super.language;
    }
    format(value) {
        return this.#cache.get(this.language).format(value);
    }
}
//# sourceMappingURL=localization.js.map