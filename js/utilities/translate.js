'use strict';

import Database from '/js/database/database.js';
import Share from '/js/io/share.js';

class Translate
{
    static *[Symbol.iterator]()
    {
        for(let i = 0; i < 10; i++)
        {
            yield i;
        }
    }

    static get(str)
    {
        return new Promise(resolve => {
            let keys = str.match(/t_[a-zA-Z_]+/g);
            let lang = Translate.__language;

            if(keys === null)
            {
                resolve(str);
            }

            let values = {};


            for(let key of keys || [])
            {
                // TODO(Chris Kruining)
                // Update this promise structure to
                // prefer the local database,
                // but always update the local
                // database to the backend value
                Database.get(`Retail.Translations.${key}`)
                    .then(
                        val => {
                            if(val[Translate.__language] === undefined)
                            {
                                throw Error('key not found');
                            }

                            return val[Translate.__language];
                        }
                    )
                    .catch(
                        e => fetch(
                            `/translate?language=${lang}&key=${key}`,
                            { credentials: 'same-origin' }
                        )
                            .then(r => r.json())
                            .then(r => Database.get(`Retail.Translations.${key}`)
                                .then(val => Database.put(
                                    `Retail.Translations`,
                                    Object.assign(val, {[lang]: r.payload.translation})
                                ))
                                .catch(e => Database.put(
                                    `Retail.Translations`,
                                    {key: key, [lang]: r.payload.translation}
                                ))
                            )
                            .then(val => val[0][lang])
                    )
                    .then(val => values[key] = val)
                    .then(() => {
                        if(Object.values(values).length === keys.length)
                        {
                            resolve(str.replace(/t_[a-zA-Z_]+/g, match => values[match]));
                        }
                    });
            }
        });
    }

    static get __language()
    {
        return Translate._language;
    }

    static set __language(language)
    {
        Translate._language = language;
        document.body.setAttribute('language', language);

        Share.set('language', language);
    }

    static __discover()
    {
        let current;
        let walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_All,
            {
                acceptNode: n => n.nodeType === 3 && n.nodeValue.match(/t_[a-zA-Z_]+/g) !== null
                    ? NodeFilter.FILTER_ACCEPT
                    : (n.nodeType === 1 && (n.classList.contains('no-translate') || n.hasAttribute('no-translate'))
                        ? NodeFilter.FILTER_REJECT
                        : NodeFilter.FILTER_SKIP
                    ),
            },
            false
        );

        let p = {
            get(obj, prop)
            {
                if(prop === '__is_proxy__')
                {
                    return true;
                }

                if(prop === 'original')
                {
                    return obj.original;
                }

                if(prop === 'nodeValue' && obj.original.nodeValue.match(/t_[a-zA-Z_]+/g) === null)
                {
                    return obj.translation;
                }

                return obj.original[prop];
            },

            set(obj, prop, val)
            {
                if(prop === 'nodeValue' && val.match(/t_[a-zA-Z_]+/g) !== null)
                {
                    obj.translation = val;
                }

                obj.original[prop] = val;

                return true;
            },
        };

        while(current = walker.nextNode())
        {
            Translate._targets.push(new Proxy({
                original: current,
                translation: current.nodeValue,
            }, p));
        }

        Array.from(
            document.querySelectorAll('*[tooltip]'),
            el => Array.from(el.attributes).find(n => n.nodeName === 'tooltip')
        )
            .forEach(n => Translate._targets.push(new Proxy({ original: n, translation: n.nodeValue }, p)));

        Translate._targets.forEach(t => {
            if(t.__translating || !t.__is_proxy__)
            {
                return;
            }

            t.__translating = true;

            Promise.all(t.nodeValue.split(/(t_[a-zA-Z_]+)/g).map(p => Translate.get(p)))
                .then(parts => {
                    if(parts.join('') !== t.nodeValue)
                    {
                        t.nodeValue = parts.join('');
                    }
                })
                .then(() => t.__translating = false);
        });
    }
}

Share.on({
    language: l => {
        Translate._language = l;
        document.body.setAttribute('language', l);
    },
    __connected__: () => Translate._language = Share.get('language') || 'en_GB',
});

Translate._targets = [];
Translate._language = 'en_GB';

let observer = new MutationObserver(records => {
    for(let record of records)
    {
        let nodes = Translate._targets.filter(
            x => (x.childOf(record.target) || x === record.target) && x.__translating !== true && x.__is_proxy__
        );

        if(
            record.target.nodeValue !== null &&
            record.target.nodeValue.match(/(t_[a-zA-Z_]+)/g) !== null &&
            record.target.__translating !== true
        ){
            nodes.push(record.target);
        }

        for(let node of nodes)
        {
            node.__translating = true;

            Promise.all(node.nodeValue.split(/(t_[a-zA-Z_]+)/g).map(p => Translate.get(p)))
                .then(parts => {
                    if(parts.join('') !== node.nodeValue)
                    {
                        node.nodeValue = parts.join('');
                    }
                })
                .then(() => node.__translating = false);
        }
    }
});
observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
});

let proto = Translate.__proto__;

Translate.__proto__ = new Proxy({}, {
    get: async (container, property) => await property in proto
        ? proto[property]
        : Translate.get(property),
    has: (container, property) => container.hasOwnProperty(property),
});

export default Translate;
