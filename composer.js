import '@fyn-software/core/extends.js';
import Style from '@fyn-software/core/style.js';
import Template from '@fyn-software/component/template.js';
import * as Comlink from '@comlink';

const worker = new Worker('/test.js', { type: 'module' });

console.log(worker);

export default class Composer
{
    static #worker = Comlink.wrap(worker);
    static #fragments = {};
    static #registration = new Map();

    static resolve(name, type = 'js')
    {
        const [ vendor, namespace, ...el ] = name.split('-');
        const ns = `${vendor}-${namespace}`;

        if(this.#registration.has(ns) === false)
        {
            throw new Error(`Trying to resolve unknown namespace :: ${ns}`);
        }

        const components = this.#registration.get(ns);

        return `${components.base}/${components[type]}${el.join('/')}.${type}`;
    }

    static async register(...urls)
    {
        await Promise.all(urls.map(async url => {
            const manifest = await fetch(`${url}/app.json`).then(r => r.json());

            for(const components of manifest.components ?? [])
            {
                components.base = url;

                this.#registration.set(components.namespace, components);
            }

            for(const [ key, path, options = {} ] of manifest.stylesheets ?? [])
            {
                await Style.set(key, path?.startsWith('./') ? path.replace(/^\./, url) : path, options);
            }
        }));
    }

    static async prepare(template)
    {
        const nodes = Array.from(template.querySelectorAll(':not(:defined)'));

        await Promise.all(nodes.map(n => n.localName).unique().map(n => this.load(n)));

        globalThis.customElements.upgrade(template);

        return template
    }

    static get fragments()
    {
        return Object.freeze({ ...this.#fragments });
    }

    static registerComponent(classDef)
    {
        const name = classDef.is ?? `${ classDef.name.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`).substr(1) }`;

        if(globalThis.customElements.get(name) === undefined)
        {
            this.#fragments[name] = fetch(this.resolve(name, 'html'))
                .then(r => r.status === 200 ? r.text() : Promise.resolve(''))
                .then(t => DocumentFragment.fromString(t))
                // TODO(Chris Kruining)
                //  To completely finish the xss protection
                //  migrate this logic to the backend
                .then(t => Template.scan(t, Object.keys(classDef.props)));

            console.log(this.#worker.test('woot?'));

            globalThis.customElements.define(name, class extends classDef.extends
            {
                #externals;
                #internals;
                #shadow;

                constructor(args = {})
                {
                    super();

                    this.#internals = this.attachInternals();
                    this.#shadow = this.#internals.shadowRoot ?? this.attachShadow({ mode: 'closed' });
                    this.#externals = new classDef(this, args);
                }

                attributeChangedCallback(...args)
                {
                    this.#externals.attributeChangedCallback(...args);
                }

                observe(...args)
                {
                    this.#externals.observe(...args);
                }

                get internals()
                {
                    return this.#internals;
                }

                get shadow()
                {
                    return this.#shadow;
                }

                static get observedAttributes()
                {
                    const attributes = classDef.observedAttributes;

                    return attributes;
                }
            });
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

        r = await import(this.resolve(el));

        return this.registerComponent(r.default);
    }
}
