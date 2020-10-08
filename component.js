import * as Extends from '../core/extends.js';
import Style from '../core/style.js';
import Base from './base.js';
import Composer from './composer.js';

export default class Component extends Base
{
    static #templates = {};

    #ready;
    #isReady = false;
    #behaviours = [];
    #template;

    constructor(args = {})
    {
        new.target.init();

        super(args);

        if(Component.#templates.hasOwnProperty(this.constructor.is) === false)
        {
            throw new Error('Expected a template, non found. did you register the component?')
        }

        this.setAttribute('loading', '');

        if(new.target.hasOwnProperty('styles'))
        {
            super.shadow.adoptedStyleSheets = Style.get(...new.target.styles);
        }

        this.#ready = (async () => {
            await this.initialize();

            const r = await this.parseTemplate(this.constructor.is);

            this._bindings = r?.bindings ?? [];
            this.#template = r?.template ?? DocumentFragment.fromString('');

            await this._populate();

            super.shadow.appendChild(this.#template);

            this.#isReady = true;

            this.emit('ready');

            await this.ready();
        })();
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

    async animateKey(key, timing = null)
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

    static async fromString(tag, properties)
    {
        return this.prepare(DocumentFragment.fromTemplate`<${tag} ${properties}></${tag}>`);
    }

    static async prepare(template)
    {
        const nodes = Array.from(template.querySelectorAll(':not(:defined)'));

        await Promise.all(nodes.map(n => n.localName).unique().map(n => Component.load(n)));

        globalThis.customElements.upgrade(template);

        return template
    }

    static register(classDef, name = null)
    {
        name = name || `${ classDef.name.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`).substr(1) }`;

        if(globalThis.customElements.get(name) === undefined)
        {
            Component.#templates[name] = fetch(Composer.resolve(name, 'html'))
                .then(r => r.status === 200 ? r.text() : Promise.resolve(''))
                .then(t => DocumentFragment.fromString(t));

            globalThis.customElements.define(name, classDef);
        }

        return globalThis.customElements.get(name);
    }

    static async load(el)
    {
        let r = globalThis.customElements.get(el);

        if(r !== undefined)
        {
            return r;
        }

        r = await import(Composer.resolve(el));

        return Component.register(r.default, el);
    }

    static async init()
    {
        if(globalThis.customElements.get(this.is) === undefined)
        {
            await Component.register(this, this.is);
        }

        return this;
    }

    get isReady()
    {
        return this.#ready;
    }

    get behaviours()
    {
        return this.#behaviours;
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
