import * as Extends from '../core/extends.js';
import Base from './base.js';
import Composer from './composer.js';

let names = {};
let templates = {};

export default class Component extends Base
{
    #ready_cb = null;
    #ready = new Promise(r => this.#ready_cb = r);
    #listeners = {};
    #behaviors = [];

    constructor(url = null)
    {
        super();

        this.setAttribute('loading', '');

        if(url === null && names.hasOwnProperty(this.constructor.name))
        {
            url = Composer.resolve(names[this.constructor.name], 'html');
        }

        if((url instanceof Promise) === false && templates.hasOwnProperty(url) === false)
        {
            templates[url] = fetch(url)
                .then(r => r.status === 200 ? r.text() : Promise.resolve(''))
                .then(t => DocumentFragment.fromString(t));
        }

        (async () => {
            const r = await this.parseTemplate(
                templates.hasOwnProperty(url)
                    ? (templates[url] instanceof Promise
                        ? await templates[url]
                        : templates[url])
                    : null
            );

            this.shadow.appendChild((r && r.template || DocumentFragment.fromString('')));

            this._bindings = [];
            if(r !== null && Array.isArray(r.bindings))
            {
                this._bindings = r.bindings;
            }

            this._populate();

            this.emit('ready');

            this.ready();

            this.#ready_cb(true);
        })();

        this.initialize();
    }

    connectedCallback()
    {
        super.connectedCallback();

        this.removeAttribute('loading');
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
            ...{ capture: false, passive: true, details: false },
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
                if(!this.#listeners.hasOwnProperty(type))
                {
                    this.#listeners[type] = {};
                }

                if(!this.#listeners[type].hasOwnProperty(target))
                {
                    this.#listeners[type][target] = [];
                }

                this.#listeners[type][target].push({ k: listener, o: { ...options, once, fireCount: 0 }});

                if(!this.#listeners[type].hasOwnProperty('_listener'))
                {
                    this.#listeners[type]._listener = e => {
                        let type = e.type;
                        let matches = Object.entries(this.#listeners[type])
                            .map(t =>  Object.assign(t, { targets: t[0] === ':scope'
                                    ? [ this ]
                                    : [
                                        ...Array.from(this.querySelectorAll(t[0])),
                                        ...Array.from(this.shadow.querySelectorAll(t[0])),
                                    ].unique()
                            }))
                            .filter(t => t.targets.some(el => e.composedPath().includes(el)));

                        for(let match of matches)
                        {
                            for(let { k: callback, o } of match[1])
                            {
                                if(o.once === true && o.fireCount > 0)
                                {
                                    continue;
                                }

                                o.fireCount++;

                                if(options.details === true)
                                {
                                    if(e instanceof CustomEvent)
                                    {
                                        callback(e.detail, match.targets.filter(el => e.composedPath().includes(el))[0]);
                                    }
                                }
                                else
                                {
                                    callback(e, match.targets.filter(el => e.composedPath().includes(el))[0]);
                                }
                            }
                        }
                    };

                    this.addEventListener(type, this.#listeners[type]._listener, options);
                    this.shadow.addEventListener(type, this.#listeners[type]._listener, options);
                }
            }
        }

        return this;
    }

    async parseTemplate(node)
    {
        const { html: template, bindings } = await this.constructor.parseHtml(this, node.cloneNode(true));

        const nodes = Array.from(template.querySelectorAll(':not(:defined)'));
        const dependencies = [...nodes.map(n => n.localName), ...(this.constructor.dependencies || [])];

        await Promise.all(dependencies.unique().map(n => Component.load(n)));
        await Promise.all(nodes.filter(n => n instanceof Component).map(n => n.isReady));

        return { template, bindings };
    }

    async animate(key, timing = null)
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

        if(animation.finished === undefined)
        {
            animation.finished = new Promise(r => animation.onfinish = r);
        }

        if(animation.effect !== undefined && timing !== null)
        {
            const duration = animation.effect.getTiming().duration;

            return Promise.delay(duration * timing).then(() => animation);
        }

        return animation.finished;
    }

    static register(classDef, name = null)
    {
        name = name || `${ classDef.name.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`).substr(1) }`;

        if(window.customElements.get(name) === undefined)
        {
            names[classDef.name] = name;

            window.customElements.define(name, classDef);
        }

        return window.customElements.get(name);
    }

    static async load(el)
    {
        let r = window.customElements.get(el);

        if(r !== undefined)
        {
            return r;
        }

        r = await import(Composer.resolve(el));

        return Component.register(r.default, el);
    }

    get isReady()
    {
        return this.#ready;
    }

    get behaviors()
    {
        return this.#behaviors;
    }

    static get registration()
    {
        return names;
    }

    static get is()
    {
        return `${ this.name.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`).substr(1) }`;
    }

    static get animations()
    {
        return {};
    }
}
