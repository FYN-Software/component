import Plugin from '@fyn-software/component/plugin/plugin.js';
import Template from '@fyn-software/component/template.js';

export default class Localization extends Plugin
{
    #resources = {
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
    #formatters = {
        default: new Formatter(),
        relativeDateTime: new RelativeDateTime(),
        dateTime: new DateTime(),
        currency: new NumberFormatter({ style: 'currency', currency: 'EUR' }),
        percent: new NumberFormatter({ style: 'percent', signDisplay: 'exceptZero' }),
    };
    #global;
    #fallback;
    #namespace = [ 'common' ];
    #cache = new Map();

    constructor()
    {
        super();

        this.#fallback = 'en-GB';
        this.language = 'en-GB';
    }

    async t(key, replacements = {})
    {
        let path = key.split('.');

        if(path.length === 1)
        {
            path = [ ...this.#namespace, path[0] ];
        }

        const language = replacements?._lang ?? this.#global;
        const translation = await this.#getTranslation(path, language);

        if(translation === undefined)
        {
            return;
        }

        const pluralRulesValue = replacements?.[translation.pluralRulesValue] ?? 1;
        let pluralization = this.#pluralization(language, pluralRulesValue);

        if(translation.hasOwnProperty(pluralization) === false)
        {
            pluralization = 'one';
        }

        return translation[pluralization].replace(/{{(?:#(?<type>[a-zA-Z]+)\s)?\s*(?<key>[a-zA-Z\-_]+)\s*}}/g, (...args) => {
            const { type = 'default', key } = args[5];
            const formatter = this.#formatters[type] ?? this.#formatters.default;

            return formatter.format(replacements[key] ?? '???');
        });
    }

    get languages()
    {
        return Object.keys(this.#resources);
    }
    get language()
    {
        return this.#global;
    }

    set language(language)
    {
        (async () => {
            if(this.languages.includes(language) === false)
            {
                throw new Error(
                    `Given language '${language}' is not supported, provice one of these: [ ${Object.keys(this.#resources).map(k => `'${k}'`).join(', ')} ]`
                );
            }

            if(language === this.#global)
            {
                return;
            }

            const old = this.#global;

            this.#global = language;

            for(const formatter of Object.values(this.#formatters))
            {
                formatter.language = language;
            }

            await this.#rerender();

            this.emit('changed', { old, new: language })
        })();
    }

    get key()
    {
        return 't';
    }

    get plugin()
    {
        const proxy = new Proxy(() => {}, {
            get: () => proxy,
            apply: (target, thisArg, [ key, options = {} ]) => this.t(key, options),
        });

        return proxy;
    }

    #pluralization(language, value)
    {
        if(this.#cache.has(language) === false)
        {
            this.#cache.set(language, new Intl.PluralRules(language));
        }

        return this.#cache.get(language).select(value);
    }

    async #getTranslation(path, language)
    {
        let translation = await this.#resources[language];
        for(const k of path)
        {
            translation = await translation[k];

            if(translation === undefined)
            {
                break;
            }
        }

        if(translation === undefined && language !== this.#fallback)
        {
            return await this.#getTranslation(path, this.#fallback);
        }

        return translation;
    }

    async #rerender()
    {
        await Promise.all(this.bindings.map(({ binding, scope }) => binding.resolve(scope)));
        await Promise.all(
            this.bindings
                .map(({ binding }) => binding.nodes)
                .reduce((t, n) => [ ...t, ...n ], [])
                .unique()
                .map(n => Template.render(n))
        );
    }
}

class Formatter
{
    #language = 'en-GB';

    set language(language)
    {
        this.#language = language;
    }

    get language()
    {
        return this.#language;
    }

    format(value)
    {
        return value;
    }
}

class NumberFormatter extends Formatter
{
    #cache = new Map();
    #conf = {
        notation: 'standard',
    };

    constructor(conf = null)
    {
        super();

        if(conf !== null)
        {
            this.#conf = conf;
        }
    }

    set language(language)
    {
        if(this.#cache.has(language) === false)
        {
            this.#cache.set(language, new Intl.NumberFormat(language, this.#conf));
        }

        super.language = language;
    }

    get language()
    {
        return super.language;
    }

    format(value)
    {
        return this.#cache.get(this.language).format(value);
    }
}

class RelativeDateTime extends Formatter
{
    // in miliseconds
    #units = {
        year  : 24 * 60 * 60 * 1000 * 365,
        month : 24 * 60 * 60 * 1000 * 365/12,
        day   : 24 * 60 * 60 * 1000,
        hour  : 60 * 60 * 1000,
        minute: 60 * 1000,
        second: 1000
    }
    #cache = new Map();

    set language(language)
    {
        if(this.#cache.has(language) === false)
        {
            this.#cache.set(language, new Intl.RelativeTimeFormat(language, { numeric: 'auto' }));
        }

        super.language = language;
    }

    get language()
    {
        return super.language;
    }

    format(value)
    {
        const elapsed = value - Date.now();

        // "Math.abs" accounts for both "past" & "future" scenarios
        for (const u in this.#units)
        {
            if (Math.abs(elapsed) > this.#units[u] || u === 'second')
            {
                return this.#cache.get(this.language).format(Math.round(elapsed / this.#units[u]), u);
            }
        }
    }
}

class DateTime extends Formatter
{
    #cache = new Map();

    set language(language)
    {
        if(this.#cache.has(language) === false)
        {
            this.#cache.set(language, new Intl.DateTimeFormat(language));
        }

        super.language = language;
    }

    get language()
    {
        return super.language;
    }

    format(value)
    {
        return this.#cache.get(this.language).format(value);
    }
}