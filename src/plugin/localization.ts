// import Plugin from './plugin.js';
// import Template from '../template.js';
//
// enum Language
// {
//     Arabic = 'ar-EG',
//     German = 'de-DE',
//     English = 'en-GB',
//     French = 'fr-FR',
//     Dutch = 'nl-NL',
// }
// type Translation = {
//     pluralRulesValue: string
//     one: string
// }&{
//     [K in Intl.LDMLPluralRule]?: string;
// };
// type Namespace = {
//     [key: string]: Promise<Namespace|Translation>
// };
// type Resources = {
//     [K in Language]: Namespace;
// };
//
// export default class Localization extends Plugin
// {
//     private _resources: Resources = {
//         [Language.Arabic]: {
//             common: fetch(`https://fyncdn.nl/locales/${Language.Arabic}/common.json`).then(r => r.json()),
//             data: fetch(`https://fyncdn.nl/locales/${Language.Arabic}/data.json`).then(r => r.json()),
//         },
//         [Language.German]: {
//             common: fetch(`https://fyncdn.nl/locales/${Language.German}/common.json`).then(r => r.json()),
//             data: fetch(`https://fyncdn.nl/locales/${Language.German}/data.json`).then(r => r.json()),
//         },
//         [Language.English]: {
//             common: fetch(`https://fyncdn.nl/locales/${Language.English}/common.json`).then(r => r.json()),
//             data: fetch(`https://fyncdn.nl/locales/${Language.English}/data.json`).then(r => r.json()),
//         },
//         [Language.French]: {
//             common: fetch(`https://fyncdn.nl/locales/${Language.French}/common.json`).then(r => r.json()),
//             data: fetch(`https://fyncdn.nl/locales/${Language.French}/data.json`).then(r => r.json()),
//         },
//         [Language.Dutch]: {
//             common: fetch(`https://fyncdn.nl/locales/${Language.Dutch}/common.json`).then(r => r.json()),
//             data: fetch(`https://fyncdn.nl/locales/${Language.Dutch}/data.json`).then(r => r.json()),
//         },
//     };
//     private _formatters: { [key: string]: Formatter } = {
//         default: new Formatter(),
//         relativeDateTime: new RelativeDateTime(),
//         dateTime: new DateTime(),
//         currency: new NumberFormatter({ style: 'currency', currency: 'EUR' }),
//         percent: new NumberFormatter({ style: 'percent', signDisplay: 'exceptZero' }),
//     };
//     private _global: Language|undefined = undefined;
//     private _fallback: Language;
//     private _namespace = [ 'common' ];
//     private _cache: Map<string, Intl.PluralRules> = new Map();
//
//     constructor()
//     {
//         super();
//
//         this._fallback = Language.English;
//         this.language = Language.English;
//     }
//
//     async t(key: string, replacements: { [key: string]: any } = {})
//     {
//         let path = key.split('.');
//
//         if(path.length === 1)
//         {
//             path = [ ...this._namespace, path[0] ];
//         }
//
//         const language: Language = replacements?._lang ?? this._global;
//         const translation: Translation = await this._getTranslation(path, language);
//
//         if(translation === undefined)
//         {
//             return;
//         }
//
//         const pluralRulesValue = replacements?.[translation.pluralRulesValue] ?? 1;
//         let pluralization: Intl.LDMLPluralRule = this._pluralization(language, pluralRulesValue);
//
//         if(translation.hasOwnProperty(pluralization) === false)
//         {
//             pluralization = 'one';
//         }
//
//         return translation[pluralization]!.replace(/{{(?:_(?<type>[a-zA-Z]+)\s)?\s*(?<key>[a-zA-Z\-_]+)\s*}}/g, (...args: Array<any>) => {
//             const { type = 'default', key }: { type: string, key: string } = args[5];
//             const formatter = this._formatters[type] ?? this._formatters.default;
//
//             return formatter.format(replacements[key] ?? '???');
//         });
//     }
//
//     get languages(): Array<Language>
//     {
//         return Object.values(Language);
//     }
//     get language(): Language
//     {
//         return this._global!;
//     }
//
//     set language(language: Language)
//     {
//         (async () => {
//             if(this.languages.includes(language) === false)
//             {
//                 const keys: string = Object.keys(this._resources).map(k => `'${k}'`).join(', ');
//                 throw new Error(
//                     `Given language '${language}' is not supported, provice one of these: [ ${keys} ]`
//                 );
//             }
//
//             if(language === this._global)
//             {
//                 return;
//             }
//
//             const old = this._global;
//
//             this._global = language;
//
//             for(const formatter of Object.values(this._formatters))
//             {
//                 formatter.language = language;
//             }
//
//             await this._rerender();
//
//             this.emit('changed', { old, new: language })
//         })();
//     }
//
//     get key(): string
//     {
//         return 't';
//     }
//
//     get plugin(): IPlugin
//     {
//         const proxy = new Proxy(() => {}, {
//             get: () => proxy,
//             apply: (target, thisArg, [ key, options = {} ]) => this.t(key, options),
//         }) as unknown as IPlugin;
//
//         return proxy;
//     }
//
//     private _pluralization(language: string, value: number): Intl.LDMLPluralRule
//     {
//         if(this._cache.has(language) === false)
//         {
//             this._cache.set(language, new Intl.PluralRules(language));
//         }
//
//         return this._cache.get(language)!.select(value);
//     }
//
//     private async _getTranslation(path: Array<string>, language: Language): Promise<Translation>
//     {
//         let translation: Namespace|Translation = await this._resources[language];
//
//         for(const k of path)
//         {
//             translation = await (translation as Namespace)[k];
//
//             if(translation === undefined)
//             {
//                 break;
//             }
//         }
//
//         if(translation === undefined && language !== this._fallback)
//         {
//             return await this._getTranslation(path, this._fallback);
//         }
//
//         return translation as Translation;
//     }
//
//     private async _rerender(): Promise<void>
//     {
//         await Promise.all(this.bindings.map(({ binding, scopes }) => binding.resolve(scopes)));
//         await Promise.all(
//             this.bindings
//                 .map(({ binding }) => binding.nodes)
//                 .reduce((t: Array<Node>, n: Set<Node>) => [ ...t, ...n ], [])
//                 .unique()
//                 .map(n => Template.render(n))
//         );
//     }
// }
//
// class Formatter
// {
//     private _language: string = 'en-GB';
//
//     set language(language: string)
//     {
//         this._language = language;
//     }
//
//     get language(): string
//     {
//         return this._language;
//     }
//
//     format(value: any): string
//     {
//         return value;
//     }
// }
//
// class NumberFormatter extends Formatter
// {
//     private _cache: Map<string, Intl.NumberFormat> = new Map();
//     private readonly _conf: Intl.NumberFormatOptions = {
//         notation: 'standard',
//     };
//
//     constructor(conf?: Intl.NumberFormatOptions)
//     {
//         super();
//
//         if(conf !== undefined)
//         {
//             this._conf = conf;
//         }
//     }
//
//     set language(language: string)
//     {
//         if(this._cache.has(language) === false)
//         {
//             this._cache.set(language, new Intl.NumberFormat(language, this._conf));
//         }
//
//         super.language = language;
//     }
//
//     get language(): string
//     {
//         return super.language;
//     }
//
//     format(value: number): string
//     {
//         return this._cache.get(this.language)!.format(value);
//     }
// }
//
// enum RelativeDateTimeUnits
// {
//     year  = 24 * 60 * 60 * 1000 * 365,
//     month = 24 * 60 * 60 * 1000 * 365/12,
//     day   = 24 * 60 * 60 * 1000,
//     hour  = 60 * 60 * 1000,
//     minute= 60 * 1000,
//     second= 1000,
// }
//
// class RelativeDateTime extends Formatter
// {
//     private _cache: Map<string, Intl.RelativeTimeFormat> = new Map();
//
//     set language(language: string)
//     {
//         if(this._cache.has(language) === false)
//         {
//             this._cache.set(language, new Intl.RelativeTimeFormat(language, { numeric: 'auto' }));
//         }
//
//         super.language = language;
//     }
//
//     get language(): string
//     {
//         return super.language;
//     }
//
//     format(value: number): string
//     {
//         const elapsed = value - Date.now();
//
//         // "Math.abs" accounts for both "past" & "future" scenarios
//         for (const [ unit, milliseconds ] of Object.entries(RelativeDateTimeUnits))
//         {
//             if (Math.abs(elapsed) > milliseconds || unit === 'second')
//             {
//                 return this._cache.get(this.language)!.format(
//                     Math.round(elapsed / (milliseconds as number)),
//                     unit as Intl.RelativeTimeFormatUnit
//                 );
//             }
//         }
//
//         return '';
//     }
// }
//
// class DateTime extends Formatter
// {
//     private _cache: Map<string, Intl.DateTimeFormat> = new Map();
//
//     set language(language: string)
//     {
//         if(this._cache.has(language) === false)
//         {
//             this._cache.set(language, new Intl.DateTimeFormat(language));
//         }
//
//         super.language = language;
//     }
//
//     get language(): string
//     {
//         return super.language;
//     }
//
//     format(value: number|Date): string
//     {
//         return this._cache.get(this.language)!.format(value);
//     }
// }