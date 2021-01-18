import Plugin from './plugin.js';
import Template from '../template.js';

export default class Localization extends Plugin
{
    #resources = {
        en: {
            common: {
                key: {
                    pluralRulesValue: 'with',
                    one: 'hello {{ with }} world {{ replacement }}',
                    other: 'hello {{#currency with }} worlds {{#relativeDateTime replacement }}',
                },
                description: {
                    one: 'description',
                },
                cancel: {
                    one: 'cancel',
                },
                save: {
                    one: 'save',
                },
            },
            data: {
                diff: {
                    deltas: {
                        one: '{{#currency price }}, {{#percent percentage }}',
                    },
                    new: {
                        one: 'new',
                    },
                    current: {
                        one: 'current',
                    },
                    purchasePrice: {
                        one: 'purchase price',
                    },
                    sellingPrice: {
                        one: 'selling price',
                    },
                },
            },
        },
        nl: {
            common: {
                key: {
                    pluralRulesValue: 'count',
                    one: 'hallo {{ with }} wereld {{ replacement }}',
                    other: 'hallo {{#currency with }} werelden {{#relativeDateTime replacement }}',
                },
                description: {
                    one: 'omschrijving',
                },
                cancel: {
                    one: 'annuleren',
                },
                save: {
                    one: 'opslaan',
                },
            },
            data: {
                diff: {
                    deltas: {
                        one: '{{#currency price }}, {{#percent percentage }}',
                    },
                    new: {
                        one: 'nieuw',
                    },
                    current: {
                        one: 'huidige',
                    },
                    purchasePrice: {
                        one: 'inkoop prijs',
                    },
                    sellingPrice: {
                        one: 'verkoop prijs',
                    },
                },
            },
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
    #current;
    #namespace = 'common';
    #pr = new Intl.PluralRules();

    constructor()
    {
        super();

        this.language = 'en';

        let i = 0;
        setInterval(() => this.language = [ 'nl', 'en' ][++i % 2], 2500);
    }

    t(key, replacements)
    {
        key = key.split('.');

        if(key.length === 1)
        {
            key = [ this.#namespace, key ];
        }

        let translation = this.#resources[this.#current];
        for(const k of key)
        {
            translation = translation[k];
        }

        const pluralization = this.#pr.select(replacements[translation.pluralRulesValue] ?? 1);

        return translation[pluralization].replace(/{{(?:#(?<type>[a-zA-Z]+)\s)?\s*(?<key>[a-zA-Z\-_]+)\s*}}/g, (...args) => {
            const { type = 'default', key } = args[5];
            const formatter = this.#formatters[type] ?? this.#formatters.default;

            return formatter.format(replacements[key] ?? '???');
        });
    }

    set language(language)
    {
        this.#global = language;
        this.#current = this.#global;

        for(const formatter of Object.values(this.#formatters))
        {
            formatter.language = language;
        }

        this.#rerender();
    }

    get key()
    {
        return 't';
    }

    get plugin()
    {
        const proxy = new Proxy(() => {}, {
            get: (target, property) =>
            {
                this.#current = property;

                return proxy;
            },
            apply: (target, thisArg, [ key, options = {} ]) =>
            {
                const value = this.t(key, options);

                this.#current = this.#global;

                return value;
            },
        });

        return proxy;
    }

    async #rerender()
    {
        await Promise.all(this.bindings.map(({ binding, scope }) => binding.resolve(scope)));
        await Promise.all(this.bindings
            .map(({ binding }) => binding.nodes)
            .reduce((t, n) => [ ...t, ...n ], [])
            .unique()
            .map(n => {
                return Template.render(n)
            }));
    }
}

class Formatter
{
    #language = 'en';

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