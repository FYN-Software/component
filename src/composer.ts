import Template from './template.js';
import Style from '@fyn-software/core/style.js';

type FileType = 'html'|'css'|'js';
type ComponentConfig = {
    [type in FileType]: string;
} & {
    base?: string;
    namespace: string;
};

type StylesheetConfig = [ string, string, RequestInit? ];

type AppManifest = {
    name: string;
    components: Array<ComponentConfig>;
    stylesheets: Array<StylesheetConfig>;
};

type Frag = {
    html: Promise<IFragment<any>>;
    css: CSSStyleSheet;
};

export default class Composer
{
    private static _fragments: { [key: string]: Frag } = {  };
    private static _registration: Map<string, ComponentConfig> = new Map();

    static resolve(name: string, type: FileType = 'js'): string
    {
        const [ vendor, namespace, ...el ] = name.split('-');
        const ns = `${vendor}-${namespace}`;

        if(this._registration.has(ns) === false)
        {
            console.log(this._registration);

            throw new Error(`Trying to resolve unknown namespace :: ${ns}`);
        }

        const components = this._registration.get(ns)!;

        return `${components.base}/${components[type as FileType]}${el.join('/')}.${type}`;
    }

    static async register(...urls: Array<string>): Promise<void>
    {
        await Promise.all(urls.map(async url => {
            const manifest: AppManifest = await fetch(`${url}/app.json`).then(r => r.json());

            for(const components of manifest.components ?? [])
            {
                components.base = url;

                this._registration.set(components.namespace, components);
            }

            for(const [ key, path, options = {} ] of manifest.stylesheets ?? [])
            {
                await Style.set(key, path?.startsWith('./') ? path.replace(/^\./, url) : path, options);
            }
        }));
    }

    static async prepare(template: Element): Promise<Element>
    {
        await Promise.all(
            Array.from(template.querySelectorAll(':not(:defined)'), n => n.localName)
                .unique()
                .map(n => this.load(n))
        );

        globalThis.customElements.upgrade(template);

        return template
    }

    static get fragments(): Readonly<{ [key: string]: Frag }>
    {
        return Object.freeze({ ...this._fragments });
    }

    static registerComponent<T extends IBase<T>>(classDef: ComponentConstructor<T>): ComponentConstructor<T>
    {
        const name = classDef.is;

        if(globalThis.customElements.get(name) === undefined)
        {
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

    public static async load<T extends IBase<T>>(name: string): Promise<ComponentConstructor<T>>
    {
        let r = globalThis.customElements.get(name);

        if(r !== undefined)
        {
            return r;
        }

        r = await import(this.resolve(name));

        return this.registerComponent(r.default);
    }
}