import * as Extends from '@fyn-software/core/extends.js';
import Style from '@fyn-software/core/style.js';
import Base from '@fyn-software/component/base.js';
import Composer from '@fyn-software/component/composer.js';

export default class Component extends Base
{
    #ready;
    #isReady = false;
    #template;
    #sugar = new Proxy({}, { get: (c, p) => this.shadow.getElementById(p) });

    constructor(args = {})
    {
        new.target.init();

        super(args);

        if(Composer.fragments.hasOwnProperty(this.constructor.is) === false)
        {
            throw new Error('Expected a template, non found. did you register the component?')
        }

        this.setAttribute('loading', '');

        this.#ready = this.#init();
    }

    async #init()
    {
        const self = this.constructor;
        const { html, css } = Composer.fragments[self.is];

        const sheet = new CSSStyleSheet();

        super.shadow.adoptedStyleSheets = Style.get(...self.styles).concat(css, sheet);

        sheet.insertRule(`:host{}`, 0);

        Object.defineProperty(this.shadow, 'setProperty', {
            value: sheet.rules[0].style.setProperty.bind(sheet.rules[0].style),
            writable: false,
            configurable: false,
            enumerable: true,
        });
        Object.defineProperty(this.shadow, 'getPropertyValue', {
            value: sheet.rules[0].style.getPropertyValue.bind(sheet.rules[0].style),
            writable: false,
            configurable: false,
            enumerable: true,
        });

        Object.defineProperty(super.shadow, 'style', {
            value: css,
            writable: false,
            configurable: false,
            enumerable: true,
        });

        await this.initialize();

        const { bindings, template } = (await this.parseTemplate(await html))
        ?? { bindings: [], template: new DocumentFragment() };

        super._bindings = bindings;
        this.#template = template;

        super.shadow.appendChild(this.#template);

        this.#isReady = true;

        await this._populate();

        await this.ready();

        this.emit('ready');
    }

    connectedCallback()
    {
        super.connectedCallback();

        this.removeAttribute('loading');
    }

    async initialize(){}
    async ready(){}

    async parseTemplate(fragment)
    {
        const { template, bindings } = await this.constructor.parseHtml(this, this, fragment);

        await Composer.prepare(template);

        return { template, bindings };
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

    static get is()
    {
        return this.localName || `${ this.name.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`).substr(1) }`;
    }
}
