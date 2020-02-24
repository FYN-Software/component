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
        new.target.init();

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

            await this._populate();

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

    async parseTemplate(node)
    {
        const { html: template, bindings } = await this.constructor.parseHtml(this, this, node.cloneNode(true));

        const nodes = Array.from(template.querySelectorAll(':not(:defined)'));

        await Promise.all(nodes.map(n => n.localName).unique().map(n => Component.load(n)));
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

    static init()
    {
        if(this.localName !== undefined && window.customElements.get(this.localName) === undefined)
        {
            Component.register(this, this.localName);
        }
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
