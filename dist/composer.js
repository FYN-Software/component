import Template from './template.js';
import Style from '@fyn-software/core/style.js';
export default class Composer {
    static resolve(name, type = 'js') {
        const [vendor, namespace, ...el] = name.split('-');
        const ns = `${vendor}-${namespace}`;
        if (this._registration.has(ns) === false) {
            console.log(this._registration);
            throw new Error(`Trying to resolve unknown namespace :: ${ns}`);
        }
        const components = this._registration.get(ns);
        return `${components.base}/${components[type]}${el.join('/')}.${type}`;
    }
    static async register(...urls) {
        await Promise.all(urls.map(async (url) => {
            const manifest = await fetch(`${url}/app.json`).then(r => r.json());
            for (const components of manifest.components ?? []) {
                components.base = url;
                this._registration.set(components.namespace, components);
            }
            for (const [key, path, options = {}] of manifest.stylesheets ?? []) {
                await Style.set(key, path?.startsWith('./') ? path.replace(/^\./, url) : path, options);
            }
        }));
    }
    static async prepare(template) {
        await Promise.all(Array.from(template.querySelectorAll(':not(:defined)'), n => n.localName)
            .unique()
            .map(n => this.load(n)));
        globalThis.customElements.upgrade(template);
        return template;
    }
    static get fragments() {
        return Object.freeze({ ...this._fragments });
    }
    static registerComponent(classDef) {
        const name = classDef.is;
        if (globalThis.customElements.get(name) === undefined) {
            this._fragments[name] = {
                html: fetch(this.resolve(name, 'html'))
                    .then(r => r.status === 200
                    ? r.text()
                    : Promise.resolve(''))
                    .then(t => DocumentFragment.fromString(t))
                    // TODO(Chris Kruining)
                    //  To completely finish the xss protection
                    //  migrate this logic to the backend
                    .then(t => Template.scan(t, classDef.properties)),
                css: (() => {
                    const sheet = new CSSStyleSheet();
                    fetch(this.resolve(name, 'css'))
                        .then(r => r.status === 200
                        ? r.text()
                        : Promise.resolve(''))
                        .then(css => sheet.replace(css));
                    return sheet;
                })(),
            };
            globalThis.customElements.define(name, classDef);
        }
        return globalThis.customElements.get(name);
    }
    static async load(name) {
        let r = globalThis.customElements.get(name);
        if (r !== undefined) {
            return r;
        }
        r = await import(this.resolve(name));
        return this.registerComponent(r.default);
    }
}
Composer._fragments = {};
Composer._registration = new Map();
//# sourceMappingURL=composer.js.map