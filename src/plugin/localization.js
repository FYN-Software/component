import Plugin from './plugin.js';
import Template from '@fyn-software/component/template.js';
export default class Localization extends Plugin {
    constructor() {
        super();
        this._resources = {
            'ar-EG': {
                common: fetch('https://fyncdn.nl/locales/ar-EG/common.json').then(r => r.json()),
                data: fetch('https://fyncdn.nl/locales/ar-EG/data.json').then(r => r.json()),
            },
            'de-DE': {
                common: fetch('https://fyncdn.nl/locales/de-DE/common.json').then(r => r.json()),
                data: fetch('https://fyncdn.nl/locales/de-DE/data.json').then(r => r.json()),
            },
            'en-GB': {
                common: fetch('https://fyncdn.nl/locales/en-GB/common.json').then(r => r.json()),
                data: fetch('https://fyncdn.nl/locales/en-GB/data.json').then(r => r.json()),
                site: fetch('https://fyncdn.nl/locales/en-GB/site.json').then(r => r.json()),
                dash: fetch('https://fyncdn.nl/locales/en-GB/dash.json').then(r => r.json()),
                shell: fetch('https://fyncdn.nl/locales/en-GB/shell.json').then(r => r.json()),
            },
            'fr-FR': {
                common: fetch('https://fyncdn.nl/locales/fr-FR/common.json').then(r => r.json()),
                data: fetch('https://fyncdn.nl/locales/fr-FR/data.json').then(r => r.json()),
            },
            'nl-NL': {
                common: fetch('https://fyncdn.nl/locales/nl-NL/common.json').then(r => r.json()),
                data: fetch('https://fyncdn.nl/locales/nl-NL/data.json').then(r => r.json()),
                site: fetch('https://fyncdn.nl/locales/nl-NL/site.json').then(r => r.json()),
                dash: fetch('https://fyncdn.nl/locales/nl-NL/dash.json').then(r => r.json()),
                shell: fetch('https://fyncdn.nl/locales/nl-NL/shell.json').then(r => r.json()),
            },
        };
        this._formatters = {
            default: new Formatter(),
            relativeDateTime: new RelativeDateTime(),
            dateTime: new DateTime(),
            currency: new NumberFormatter({ style: 'currency', currency: 'EUR' }),
            percent: new NumberFormatter({ style: 'percent', signDisplay: 'exceptZero' }),
        };
        this._namespace = ['common'];
        this._cache = new Map();
        this._fallback = 'en-GB';
        this.language = 'en-GB';
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
        return Object.keys(this._resources);
    }
    get language() {
        return this._global;
    }
    set language(language) {
        (async () => {
            if (this.languages.includes(language) === false) {
                throw new Error(`Given language '${language}' is not supported, provice one of these: [ ${Object.keys(this._resources).map(k => `'${k}'`).join(', ')} ]`);
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
        await Promise.all(this.bindings.map(({ binding, scope }) => binding.resolve(scope)));
        await Promise.all(this.bindings
            .map(({ binding }) => binding.nodes)
            .reduce((t, n) => [...t, ...n], [])
            .unique()
            .map(n => Template.render(n)));
    }
}
class Formatter {
    constructor() {
        this._language = 'en-GB';
    }
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
    constructor(conf) {
        super();
        this._cache = new Map();
        this._conf = {
            notation: 'standard',
        };
        if (conf !== null) {
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
class RelativeDateTime extends Formatter {
    constructor() {
        super(...arguments);
        // in miliseconds
        this._units = {
            year: 24 * 60 * 60 * 1000 * 365,
            month: 24 * 60 * 60 * 1000 * 365 / 12,
            day: 24 * 60 * 60 * 1000,
            hour: 60 * 60 * 1000,
            minute: 60 * 1000,
            second: 1000
        };
        this._cache = new Map();
    }
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
        // "Math.abs" accounts for both "past" & "future" scenarios
        for (const u in this._units) {
            if (Math.abs(elapsed) > this._units[u] || u === 'second') {
                return this._cache.get(this.language).format(Math.round(elapsed / this._units[u]), u);
            }
        }
    }
}
class DateTime extends Formatter {
    constructor() {
        super(...arguments);
        this._cache = new Map();
    }
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