import { arrayFromAsync } from '../../../core/dist/functions.js';
import * as Path from 'path';
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
    constructor(context) {
        this._context = context;
    }
    get components() {
        return this._context.then(m => m.components);
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
                    : getTemplateInnerHtml(dom, node);
                for (const [el, comp] of Object.entries(await this.scanHtml(html))) {
                    imports[el] = comp;
                }
            }
        }
        return imports;
    }
    async parseHtml(code, allowedKeys) {
        const components = (await this._context).components;
        const s = new MagicString(code);
        const map = new Map([['__root__', new Map]]);
        const imports = {};
        const templates = new Set;
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
                        const shadowCss = component.meta?.styles.map(s => `<style for="${s}"></style>`).join('\n') ?? '';
                        const result = await this.parseHtml(shadowHtml, component.meta?.properties);
                        for (const [id, matches] of result.map) {
                            map.set(id === '__root__' ? element.localName : id, matches);
                        }
                        imports[element.localName] = component;
                        const template = `
                        <template shadowroot="closed">
                            ${shadowCss}

                            ${result.code}
                        </template>
                    `.replaceAll(/[\n\t]|\s{2,}/g, '');
                        s.appendRight(location.startTag.endOffset, template);
                        break;
                    }
                case 'variable':
                    {
                        const { matches, value } = result;
                        if (matches) {
                            for (const [k, v] of matches) {
                                map.get('__root__').set(k, v);
                            }
                        }
                        s.overwrite(location.startOffset, location.endOffset, node.nodeType === 2
                            ? `${node.localName}="${value}"`
                            : value);
                        break;
                    }
                case 'template':
                    {
                        templates.add(result.id);
                        const template = getTemplateInnerHtml(dom, node);
                        const templateResult = await this.parseHtml(template);
                        for (const [id, matches] of templateResult.map) {
                            map.set(id === '__root__' ? result.id : id, matches);
                        }
                        s.overwrite(location.startOffset, location.endOffset, '');
                        s.append(`<template id="${result.id}">${templateResult.code}</template>`);
                        break;
                    }
            }
        }
        return {
            code: s,
            map,
            imports,
            templates,
        };
    }
    static async loadManifest(path) {
        const { name = '', components: comps = [], stylesheets = [], dependencies: deps = [] } = JSON.parse(await fs.readFile(Path.resolve(path, 'app.json')).then(b => b.toString()));
        const dependencies = await Promise.all(deps.map(d => Composer.loadManifest(d)));
        const components = await comps.reduce(async (components, namespace) => ({
            ...(await components),
            ...(Object.fromEntries(await arrayFromAsync(toComponent(walkDirTree(Path.resolve(path, namespace.ts)), path, namespace)))),
            ...dependencies.reduce((flattened, d) => ({ ...flattened, ...d.components }), {})
        }), Promise.resolve({}));
        return {
            name,
            dependencies,
            components,
            stylesheets,
        };
    }
    static from(path) {
        return new Composer(Composer.loadManifest(path));
    }
}
//# sourceMappingURL=composer.js.map