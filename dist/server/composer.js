import { arrayFromAsync } from '../../../core/dist/functions.js';
import * as Path from 'path';
import * as https from 'https';
import { promises as fs } from 'fs';
import MagicString from 'magic-string';
import { JSDOM } from 'jsdom';
import Template from './template.js';
function getTemplateInnerHtml(dom, template) {
    const div = dom.window.document.createElement('div');
    div.appendChild(template.content.cloneNode(true));
    return div.innerHTML;
}
async function* walkDirTree(path) {
    if (typeof path === 'string') {
        path = [path];
    }
    const dir = await fs.opendir(Path.join(...path));
    for await (const dirent of dir) {
        switch (true) {
            case dirent.isFile() && dirent.name.endsWith('.ts'):
                {
                    yield [...path, dirent.name].slice(1);
                    break;
                }
            case dirent.isDirectory():
                {
                    yield* walkDirTree([...path, dirent.name]);
                    break;
                }
            default:
                {
                    break;
                }
        }
    }
}
function fetch(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (resp) => {
            let data = '';
            resp.on('data', chunk => data += chunk);
            resp.on('end', () => resolve(data));
        }).on("error", (err) => reject(err));
    });
}
async function* toComponent(partsIterator, path, { namespace, html, css, ts, import: relative }) {
    for await (const parts of partsIterator) {
        const comp = parts.splice(-1, 1)[0].replace('.ts', '');
        const id = [namespace, ...parts, comp].join('-');
        yield [
            id,
            {
                id,
                namespace,
                resources: {},
                files: {
                    html: Path.resolve(path, html, ...parts, `${comp}.html`),
                    css: Path.resolve(path, css, ...parts, `${comp}.css`),
                    ts: Path.resolve(path, ts, ...parts, `${comp}.ts`),
                    import: relative + Path.join(...parts, `${comp}.js`),
                },
            }
        ];
    }
}
export default class Composer {
    _context;
    _cache = new Map;
    constructor(context) {
        this._context = context;
    }
    get components() {
        return this._context.then(m => m.components);
    }
    get stylesheets() {
        return this._context.then(m => m.stylesheets);
    }
    async resolve(id) {
        return Object.values((await this._context).components).find(c => c.files.ts === id || c.module === id);
    }
    async loadResource(name, type) {
        const components = (await this._context).components;
        if (components.hasOwnProperty(name) === false) {
            return;
        }
        const component = components[name];
        component.resources[type] ??= fs.readFile(component.files[type]).then(b => b.toString());
        return component.resources[type];
    }
    async scanHtml(code) {
        const components = (await this._context).components;
        const imports = {};
        const dom = new JSDOM(code, {
            includeNodeLocations: true,
        });
        for await (const { type, node } of await Template.scan(dom)) {
            const name = node.localName;
            const component = components[name];
            if (component !== undefined) {
                imports[name] = component;
            }
            if (type === 'element' || type === 'template') {
                const element = node;
                const html = type === 'element'
                    ? (await this.loadResource(element.localName, 'html'))
                    : node.innerHTML;
                for (const [el, comp] of Object.entries(await this.scanHtml(html))) {
                    imports[el] = comp;
                }
            }
        }
        return imports;
    }
    async parseHtml(code, allowedKeys) {
        if (this._cache.has(code) === false) {
            const { components, theme } = await this._context;
            const s = new MagicString(code);
            const root = new Map;
            const map = new Map([
                ['__root__', root],
            ]);
            const imports = {};
            const templates = new Map;
            const dom = new JSDOM(code, {
                includeNodeLocations: true,
            });
            for await (const result of await Template.parse(dom, allowedKeys ?? [])) {
                const { node, location } = result;
                switch (result.type) {
                    case 'element':
                        {
                            const element = node;
                            const component = components[element.localName];
                            if (component === undefined) {
                                break;
                            }
                            const shadowHtml = (await this.loadResource(element.localName, 'html'));
                            const shadowCss = (await this.loadResource(element.localName, 'css'));
                            const sheets = await this.stylesheets;
                            const styles = component.meta.styles.map(s => `/*== ${s} ==*/${sheets[s]}`);
                            let themeStyle = '';
                            if (theme) {
                                const themeStylePath = Path.resolve(theme, ...(`${element.localName}.css`).split('-'));
                                try {
                                    themeStyle = (await fs.readFile(themeStylePath)).toString();
                                }
                                catch {
                                }
                            }
                            const result = await this.parseHtml(shadowHtml, component.meta?.properties ?? allowedKeys);
                            for (const [id, matches] of result.map) {
                                map.set(id === '__root__' ? element.localName : id, matches);
                            }
                            for (const template of result.templates.entries()) {
                                templates.set(...template);
                            }
                            imports[element.localName] = component;
                            const template = `
                            <template shadowroot="closed">
                                <style>
                                    :host{}

                                    ${styles.join('\n')}

                                    /*== Shadow ==*/
                                    ${shadowCss}

                                    /*== Theme ==*/
                                    ${themeStyle}
                                </style>

                                ${result.code}
                            </template>
                        `;
                            s.appendRight(location.startTag.endOffset, template);
                            break;
                        }
                    case 'variable':
                        {
                            const { matches, value } = result;
                            if (matches) {
                                for (const [k, v] of matches) {
                                    root.set(k, v);
                                }
                            }
                            s.overwrite(location.startOffset, location.endOffset, node.nodeType === 2
                                ? `${node.localName}="${value}"`
                                : value);
                            break;
                        }
                    case 'template':
                        {
                            const el = node;
                            let { keys } = result;
                            let match = undefined;
                            if (el.hasAttribute('for')) {
                                const parentMap = map.get(el.parentElement.localName);
                                const m = el.getAttribute('for')?.match(/^(.+)\[(:\w+)]$/);
                                if (parentMap && m) {
                                    const [, query, dir] = m;
                                    for (const { directive } of parentMap.values()) {
                                        if (directive === undefined) {
                                            continue;
                                        }
                                        const attr = directive.node;
                                        if (attr.ownerElement?.matches(query) && attr.ownerElement?.hasAttribute(dir)) {
                                            directive.fragment = result.id;
                                            match = directive;
                                        }
                                    }
                                }
                            }
                            const template = node.innerHTML;
                            const templateResult = await this.parseHtml(template, match?.keys ?? keys ?? allowedKeys);
                            if (template.length > 0) {
                                s.overwrite(location.startOffset, location.endOffset, '');
                            }
                            for (const [id, matches] of templateResult.map) {
                                map.set(id === '__root__' ? result.id : id, matches);
                            }
                            for (const template of templateResult.templates.entries()) {
                                templates.set(...template);
                            }
                            templates.set(result.id, templateResult.code);
                            break;
                        }
                }
            }
            this._cache.set(code, {
                code: s,
                map,
                imports,
                templates,
            });
        }
        return this._cache.get(code);
    }
    static async loadManifest(path) {
        const { name = '', theme = undefined, components: comps = [], stylesheets = {}, dependencies: deps = [] } = JSON.parse(await fs.readFile(Path.resolve(path, 'app.json')).then(b => b.toString()));
        const dependencies = await Promise.all(deps.map(d => Composer.loadManifest(d)));
        const components = await comps.reduce(async (components, namespace) => ({
            ...(await components),
            ...(Object.fromEntries(await arrayFromAsync(toComponent(walkDirTree(Path.resolve(path, namespace.ts)), path, namespace)))),
            ...dependencies.reduce((flattened, d) => ({ ...flattened, ...d.components }), {})
        }), Promise.resolve({}));
        for (const [k, p] of Object.entries(stylesheets)) {
            stylesheets[k] = p.startsWith('http')
                ? await fetch(p)
                : (await fs.readFile(Path.resolve(path, p))).toString();
        }
        return {
            name,
            theme,
            dependencies,
            components,
            stylesheets: dependencies
                .map(d => d.stylesheets)
                .concat(stylesheets)
                .reduce((t, d) => ({ ...t, ...d }), {}),
        };
    }
    static from(path) {
        return new Composer(Composer.loadManifest(path));
    }
}
//# sourceMappingURL=composer.js.map