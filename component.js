import * as Extends from '@fyn-software/core/extends.js';
import Style from '@fyn-software/core/style.js';
import Base from '@fyn-software/component/base.js';
import Composer from '@fyn-software/component/composer.js';

export default class Component extends Base
{
    #ready;
    #isReady = false;
    #template;
    #sugar;

    constructor(args = {})
    {
        new.target.init();

        super(args);

        if(Composer.fragments.hasOwnProperty(this.constructor.is) === false)
        {
            throw new Error('Expected a template, non found. did you register the component?')
        }

        this.setAttribute('loading', '');

        this.#sugar = new Proxy({}, { get: (c, p) => this.shadow.getElementById(p) });
        this.#ready = (async () => {
            await this.initialize();

            const self = this.constructor;

            const { bindings, template, css } = (await this.parseTemplate(self.is))
                ?? { bindings: [], template: new DocumentFragment(), css: new CSSStyleSheet() };

            super.shadow.adoptedStyleSheets = Style.get(...self.styles).concat(css);

            Object.defineProperty(super.shadow, 'style', {
                value: css,
                writable: false,
                configurable: false,
                enumerable: true,
            });

            super._bindings = bindings;
            this.#template = template;

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

    async initialize(){}
    async ready(){}

    async parseTemplate(name)
    {
        const { html: fragment, css } = await Composer.fragments[name];
        const { template, bindings } = await this.constructor.parseHtml(this, this, fragment);

        await Composer.prepare(template);

        return { template, bindings, css };
    }

    async animateKey(key, timing = null)
    {
        let options = Extends.clone(this.constructor.animations?.[key] ?? [[], {}]);

        while(options[1].hasOwnProperty('extend'))
        {
            let newOptions = Extends.clone(this.constructor.animations?.[options[1].extend] ?? [[], {}]);

            delete options[1].extend;

            newOptions[1] = { ...newOptions[1], ...options[1] };

            options = newOptions;
        }

        const animation = super.animate(...options);

        if(animation.effect === undefined || timing === null)
        {
            const duration = animation.effect.getTiming().duration;

            await Promise.delay(duration * timing);

            return animation;
        }

        return animation.finished;
    }

    static async fromString(tag, properties)
    {
        return Composer.prepare(DocumentFragment.fromTemplate`<${tag} ${properties}></${tag}>`);
    }

    static async init()
    {
        await Composer.registerComponent(this);

        return this;
    }

    get $()
    {
        return this.#sugar;
    }

    get isReady()
    {
        return this.#ready;
    }

    get shadow()
    {
        return this.#isReady
            ? super.shadow
            : this.#template ?? super.shadow;
    }

    static get is()
    {
        return this.localName || `${ this.name.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`).substr(1) }`;
    }
}
