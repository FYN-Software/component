import * as Extends from '../core/extends.js';
import Base from './base.js';
import Composer from './composer.js';

export default class Component extends Base
{
    static #templates = {};

    #ready_cb = null;
    #ready = new Promise(r => this.#ready_cb = r);
    #isReady = false;
    #behaviors = [];
    #template;

    constructor()
    {
        new.target.init();

        super();

        if(Component.#templates.hasOwnProperty(this.constructor.localName) === false)
        {
            throw new Error('Expected a template, non found. did you register the component?')
        }

        this.setAttribute('loading', '');

        (async () => {
            const r = await this.parseTemplate(this.constructor.localName);

            this._bindings = [];
            if(r !== null && Array.isArray(r.bindings))
            {
                this._bindings = r.bindings;
            }

            this.#template = (r && r.template || DocumentFragment.fromString(''));

            await this._populate();

            super.shadow.appendChild(this.#template);

            this.emit('ready');

            this.#isReady = true;

            await this.ready();

            this.#ready_cb(true);
        })();

        this.initialize();
    }

    connectedCallback()
    {
        super.connectedCallback();

        this.removeAttribute('loading');
    }

    initialize(){}
    ready(){}

    async parseTemplate(name)
    {
        const node = await Component.#templates[name];
        const { html: template, bindings } = await this.constructor.parseHtml(this, this, node.cloneNode(true));

        await this.constructor.prepare(template);

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

    static async prepare(template)
    {
        const nodes = Array.from(template.querySelectorAll(':not(:defined)'));

        if(nodes.length === 0)
        {
            return template;
        }

        await Promise.all(nodes.map(n => n.localName).unique().map(n => Component.load(n)));

        console.log(Array.from(template.querySelectorAll(':not(:defined)')));

        await Promise.all(nodes.filter(n => n instanceof Component).map(n => n.isReady));

        return template
    }

    static register(classDef, name = null)
    {
        name = name || `${ classDef.name.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`).substr(1) }`;

        if(window.customElements.get(name) === undefined)
        {
            Component.#templates[name] = fetch(Composer.resolve(name, 'html'))
                .then(r => r.status === 200 ? r.text() : Promise.resolve(''))
                .then(t => DocumentFragment.fromString(t));

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

    get shadow()
    {
        return this.#isReady
            ? super.shadow
            : this.#template || super.shadow;
    }

    static get is()
    {
        return this.localName || `${ this.name.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`).substr(1) }`;
    }

    static get animations()
    {
        return {};
    }
}
