'use strict';

import * as Extends from './extends.js';
import ObservingElement from './observingElement.js';
import Composer from './composer.js';

let names = {};
let templates = {};

export default class Component extends ObservingElement
{
    constructor(url = null)
    {
        super();

        this._template = '';
        this._listeners = {};
        this.__ready_cb = null;
        this.__ready = new Promise((r) => {
            this.__ready_cb = r;
        });

        if(url !== false)
        {
            if(url === null && names.hasOwnProperty(this.constructor.name))
            {
                url = Composer.resolve(names[this.constructor.name], 'html');
            }

            let p;

            if(templates.hasOwnProperty(url) && templates[url] instanceof Promise)
            {
                p = templates[url];
            }
            else if(templates.hasOwnProperty(url))
            {
                p = Promise.resolve(templates[url]);
            }
            else
            {
                p = templates[url] = fetch(url)
                    .then(r => r.status === 200 ? r.text() : Promise.resolve(''))
                    .stage(t => {
                        templates[url] = t;
                    });
            }

            p.then(t => this.setTemplate(t))
                .then(() => {
                    this.emit('templateChanged', this._template);
                    this.emit('ready');

                    this.ready();

                    this.__ready_cb(true);
                });
        }
        else
        {
            this.emit('ready');

            this.ready();

            this.__ready_cb(true);
        }

        // NOTE(Chris Kruining)
        // 'delay' is used to make the
        // initialize call asynchronous
        setTimeout(() => {
            this.initialize();

            this.__initialized = true;
        }, 0);
    }

    ready(){}
    initialize(){}

    on(target, events)
    {
        if(typeof target !== 'string')
        {
            events = target;
            target = ':scope';
        }

        events = { ...events };

        let { options = {} } = events;
        let once = false;

        options = {
            ...{ capture: false, passive: true },
            ...options
        };

        if(options.hasOwnProperty('once'))
        {
            once = options.once;
            delete options.once;
        }

        delete events.options;

        for(let [key, listener] of Object.entries(events))
        {
            for(let type of key.split('|'))
            {
                if(!this._listeners.hasOwnProperty(type))
                {
                    this._listeners[type] = {};
                }

                if(!this._listeners[type].hasOwnProperty(target))
                {
                    this._listeners[type][target] = [];
                }

                this._listeners[type][target].push({ k: listener, o: { ...options, once, fireCount: 0 }});

                if(!this._listeners[type].hasOwnProperty('_listener'))
                {
                    this._listeners[type]._listener = e => {
                        let type = e.type;
                        let matches = Object.entries(this._listeners[type]).map(
                            t =>  Object.assign(t, { targets: t[0] === ':scope'
                                    ? [ this ]
                                    : [
                                        ...Array.from(this.querySelectorAll(t[0])),
                                        ...Array.from(this.shadow.querySelectorAll(t[0])),
                                    ].unique()
                            })
                        ).filter(t => t.targets.some(el => e.path.includes(el)));

                        for(let match of matches)
                        {
                            for(let { k: callback, o } of match[1])
                            {
                                if(o.once === true && o.fireCount > 0)
                                {
                                    continue;
                                }

                                o.fireCount++;

                                callback(e, match.targets.filter(el => e.path.includes(el))[0]);
                            }
                        }
                    };

                    this.addEventListener(type, this._listeners[type]._listener, options);
                    this.shadow.addEventListener(type, this._listeners[type]._listener, options);
                }
            }
        }

        return this;
    }

    setTemplate(str)
    {
        this._template = str instanceof DocumentFragment
            ? str
            : DocumentFragment.fromString(str);
        this._shadow.appendChild(this._parseHtml(this._template.cloneNode(true)));

        const nodes = Array.from(this._shadow.querySelectorAll(':not(:defined)'));
        const dependencies = [...nodes.map(n => n.localName), ...(this.constructor.dependencies || [])];

        return Promise.all(dependencies.unique().map(n => Component.load(n)))
            .stage(() => Promise.all(nodes.filter(n => n instanceof Component).map(n => n.__ready)))
            .stage(() => this._populate());
    }

    animate(key, timing = null)
    {
        let options = Extends.clone(this.constructor.animations[key] || [[], {}]);

        while(options[1].hasOwnProperty('extend'))
        {
            let newOptions = Extends.clone(this.constructor.animations[options[1].extend] || [[], {}]);

            delete options[1].extend;

            newOptions[1] = Object.assign(newOptions[1], options[1]);

            options = newOptions;
        }

        let animation = super.animate(...options);
        let duration = animation.effect.getTiming().duration;

        return timing !== null
            ? Promise.delay(duration * timing).then(() => animation)
            : animation.finished;
    }

    static register(classDef, name = null)
    {
        let n = name || `${ classDef.prototype.constructor.name.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`).substr(1) }`;
        
        if(window.customElements.get(n) === undefined)
        {
            names[classDef.prototype.constructor.name] = n;

            try
            {
                window.customElements.define(n, classDef);
            }
            catch(e)
            {
                console.error(e);
            }
        }

        return classDef;
    }

    static load(el)
    {
        let r = window.customElements.get(el);

        return r !== undefined
            ? Promise.resolve(r)
            : import(Composer.resolve(el))
                .then(r => Component.register(r.default, el));
    }

    static get registration()
    {
        return names;
    }

    static get animations()
    {
        return {};
    }
}
