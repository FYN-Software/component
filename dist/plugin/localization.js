import Plugin from './plugin.js';
import Template from '../client/template.js';
var Language;
(function (Language) {
    Language["Arabic"] = "ar-EG";
    Language["German"] = "de-DE";
    Language["English"] = "en-GB";
    Language["French"] = "fr-FR";
    Language["Dutch"] = "nl-NL";
})(Language || (Language = {}));
export default class Localization extends Plugin {
    _resources = {
        [Language.Arabic]: {
            common: fetch(`https://fyncdn.nl/locales/${Language.Arabic}/common.json`).then(r => r.json()),
            data: fetch(`https://fyncdn.nl/locales/${Language.Arabic}/data.json`).then(r => r.json()),
        },
        [Language.German]: {
            common: fetch(`https://fyncdn.nl/locales/${Language.German}/common.json`).then(r => r.json()),
            data: fetch(`https://fyncdn.nl/locales/${Language.German}/data.json`).then(r => r.json()),
        },
        [Language.English]: {
            common: fetch(`https://fyncdn.nl/locales/${Language.English}/common.json`).then(r => r.json()),
            data: fetch(`https://fyncdn.nl/locales/${Language.English}/data.json`).then(r => r.json()),
        },
        [Language.French]: {
            common: fetch(`https://fyncdn.nl/locales/${Language.French}/common.json`).then(r => r.json()),
            data: fetch(`https://fyncdn.nl/locales/${Language.French}/data.json`).then(r => r.json()),
        },
        [Language.Dutch]: {
            common: fetch(`https://fyncdn.nl/locales/${Language.Dutch}/common.json`).then(r => r.json()),
            data: fetch(`https://fyncdn.nl/locales/${Language.Dutch}/data.json`).then(r => r.json()),
        },
    };
    _formatters = {
        default: new Formatter(),
        relativeDateTime: new RelativeDateTime(),
        dateTime: new DateTime(),
        currency: new NumberFormatter({ style: 'currency', currency: 'EUR' }),
        percent: new NumberFormatter({ style: 'percent', signDisplay: 'exceptZero' }),
    };
    _global = undefined;
    _fallback;
    _namespace = ['common'];
    _cache = new Map();
    constructor() {
        super();
        this._fallback = Language.English;
        this.language = Language.English;
    }
    async t(key, replacements = {}) {
        let path = key.split('.');
        if (path.length === 1) {
            path = [...this._namespace, path[0]];
        }
        const language = replacements?._lang ?? this._global;
        const translation = await this._getTranslation(path, language);
        if (translation === undefined) {
            return;
        }
        const pluralRulesValue = replacements?.[translation.pluralRulesValue] ?? 1;
        let pluralization = this._pluralization(language, pluralRulesValue);
        if (translation.hasOwnProperty(pluralization) === false) {
            pluralization = 'one';
        }
        return translation[pluralization].replace(/{{(?:_(?<type>[a-zA-Z]+)\s)?\s*(?<key>[a-zA-Z\-_]+)\s*}}/g, (...args) => {
            const { type = 'default', key } = args[5];
            const formatter = this._formatters[type] ?? this._formatters.default;
            return formatter.format(replacements[key] ?? '???');
        });
    }
    get languages() {
        return Object.values(Language);
    }
    get language() {
        return this._global;
    }
    set language(language) {
        (async () => {
            if (this.languages.includes(language) === false) {
                const keys = Object.keys(this._resources).map(k => `'${k}'`).join(', ');
                throw new Error(`Given language '${language}' is not supported, provice one of these: [ ${keys} ]`);
            }
            if (language === this._global) {
                return;
            }
            const old = this._global;
            this._global = language;
            for (const formatter of Object.values(this._formatters)) {
                formatter.language = language;
            }
            await this._rerender();
            this.emit('changed', { old, new: language });
        })();
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
    _pluralization(language, value) {
        if (this._cache.has(language) === false) {
            this._cache.set(language, new Intl.PluralRules(language));
        }
        return this._cache.get(language).select(value);
    }
    async _getTranslation(path, language) {
        let translation = await this._resources[language];
        for (const k of path) {
            translation = await translation[k];
            if (translation === undefined) {
                break;
            }
        }
        if (translation === undefined && language !== this._fallback) {
            return await this._getTranslation(path, this._fallback);
        }
        return translation;
    }
    async _rerender() {
        await Promise.all(this.bindings.map(({ binding, scopes }) => binding.resolve(scopes)));
        await Promise.all(this.bindings
            .map(({ binding }) => binding.nodes)
            .reduce((t, n) => [...t, ...n], [])
            .unique()
            .map(n => Template.render(n)));
    }
}
class Formatter {
    _language = 'en-GB';
    set language(language) {
        this._language = language;
    }
    get language() {
        return this._language;
    }
    format(value) {
        return value;
    }
}
class NumberFormatter extends Formatter {
    _cache = new Map();
    _conf = {
        notation: 'standard',
    };
    constructor(conf) {
        super();
        if (conf !== undefined) {
            this._conf = conf;
        }
    }
    set language(language) {
        if (this._cache.has(language) === false) {
            this._cache.set(language, new Intl.NumberFormat(language, this._conf));
        }
        super.language = language;
    }
    get language() {
        return super.language;
    }
    format(value) {
        return this._cache.get(this.language).format(value);
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
    _cache = new Map();
    set language(language) {
        if (this._cache.has(language) === false) {
            this._cache.set(language, new Intl.RelativeTimeFormat(language, { numeric: 'auto' }));
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
                return this._cache.get(this.language).format(Math.round(elapsed / milliseconds), unit);
            }
        }
        return '';
    }
}
class DateTime extends Formatter {
    _cache = new Map();
    set language(language) {
        if (this._cache.has(language) === false) {
            this._cache.set(language, new Intl.DateTimeFormat(language));
        }
        super.language = language;
    }
    get language() {
        return super.language;
    }
    format(value) {
        return this._cache.get(this.language).format(value);
    }
}
//# sourceMappingURL=localization.js.map