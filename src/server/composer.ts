import { arrayFromAsync } from '../../../core/dist/functions.js';
import * as Path from 'path';
import { promises as fs, Dir, Dirent } from 'fs';
import MagicString from 'magic-string';
import { JSDOM } from 'jsdom';
import Template from './template.js';

type StoredNamespace = {
    namespace: string;
    html: string;
    css: string;
    ts: string;
    import: string;
};

type StoredManifest = {
    name: string;
    dependencies?: Array<string>;
    components: Array<StoredNamespace>;
    stylesheets: Array<[ string, string ]>;
}

type TypeMap<T extends Promise<string>|string = string> = {
    html: T,
    css: T,
    ts: T,
    import: T,
};

type Component = {
    id: string;
    namespace: string;
    module?: string;
    meta?: {
        name: string;
        styles: Array<string>;
        properties: Array<string>;
    };
    resources: Partial<TypeMap<Promise<string>>>;
    files: TypeMap;
};
export type ComponentMap = { [key: string]: Component };

type Manifest = {
    name: string;
    dependencies: Array<Manifest>;
    components: ComponentMap;
    stylesheets: Array<[ string, string ]>;
}

export type HtmlResult = {
    code: MagicString;
    map: Map<string, Map<string, CachedBinding>>;
    imports: ComponentMap;
    templates: Set<string>;
};

function getTemplateInnerHtml(dom: JSDOM, template: HTMLTemplateElement): string
{
    const div = dom.window.document.createElement('div');
    div.appendChild(template.content.cloneNode(true));

    return  div.innerHTML;
}

async function *walkDirTree(path: Array<string>|string): AsyncGenerator<Array<string>, void, void>
{
    if(typeof path === 'string')
    {
        path = [ path ];
    }

    const dir: Dir = await fs.opendir(Path.join(...path));

    for await (const dirent of dir as AsyncIterable<Dirent>)
    {
        switch (true)
        {
            case dirent.isFile() && dirent.name.endsWith('.ts'):
            {
                yield [ ...path, dirent.name].slice(1);
                break;
            }

            case dirent.isDirectory():
            {
                yield* walkDirTree([ ...path, dirent.name]);
                break;
            }

            default:
            {
                // TODO(Chris Kruining)
                //  Do we ever want to act on
                //  the other types here?
                //  Or maybe error out?
                break;
            }
        }
    }
}

async function *toComponent(
    partsIterator: AsyncIterable<Array<string>>,
    path: string,
    { namespace, html, css, ts, import: relative }: StoredNamespace
): AsyncGenerator<[ string, Component ], void, void>
{
    for await (const parts of partsIterator)
    {
        const comp = parts.splice(-1, 1)[0].replace('.ts', '');
        const id = [ namespace, ...parts, comp ].join('-');

        yield [
            id,
            {
                id,
                namespace,
                resources: {
                    // html: fs.readFile(Path.resolve(path, html, ...parts, `${comp}.html`)),
                    // css: fs.readFile(Path.resolve(path, css, ...parts, `${comp}.css`)),
                    // ts: fs.readFile(Path.resolve(path, ts, ...parts, `${comp}.ts`)),
                },
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

export default class Composer
{
    private readonly _context: Promise<Manifest>;

    public constructor(context: Promise<Manifest>)
    {
        this._context = context;
    }

    public get components(): Promise<ComponentMap>
    {
        return this._context.then(m => m.components);
    }

    public async resolve(id: string): Promise<Component|undefined>
    {
        return Object.values((await this._context).components).find(c => c.files.ts === id || c.module === id);
    }

    public async loadResource(name: string, type: keyof TypeMap): Promise<string|undefined>
    {
        const components = (await this._context).components;

        if(components.hasOwnProperty(name) === false)
        {
            return;
        }

        const component: Component = components[name]!;

        component.resources[type] ??= fs.readFile(component.files[type]).then(b => b.toString());

        return component.resources[type];
    }

    public async scanHtml(code: string): Promise<ComponentMap>
    {
        const components = (await this._context).components;

        const imports: ComponentMap = {};

        const dom = new JSDOM(code, {
            includeNodeLocations: true,
        });

        for await (const { type, node } of await Template.scan(dom))
        {
            const name = (node as Element).localName;
            const component = components[name];

            if(component !== undefined)
            {
                imports[name] = component;
            }

            if(type === 'element' || type === 'template')
            {
                const element = node as Element;
                const html = type === 'element'
                    ? (await this.loadResource(element.localName, 'html'))!
                    : getTemplateInnerHtml(dom, node as HTMLTemplateElement);

                for(const [ el, comp ] of Object.entries(await this.scanHtml(html)))
                {
                    imports[el] = comp;
                }
            }
        }

        return imports;
    }

    public async parseHtml(code: string, allowedKeys?: Array<string>): Promise<HtmlResult>
    {
        const components = (await this._context).components;

        const s = new MagicString(code);
        const map: Map<string, Map<string, CachedBinding>> = new Map([ [ '__root__', new Map ] ]);
        const imports: ComponentMap = {};
        const templates: Set<string> = new Set;

        const dom = new JSDOM(code, {
            includeNodeLocations: true,
        });

        for await (const result of await Template.parse(dom, allowedKeys ?? []))
        {
            const { node, location } = result;

            switch (result.type)
            {
                case 'element':
                {
                    const element = node as Element;
                    const component = components[element.localName];

                    if(component === undefined)
                    {
                        break;
                    }

                    // TODO(Chris Kruining)
                    // - minify html
                    // - minify css
                    // - figure out how to load the whole css file stack

                    const shadowHtml = (await this.loadResource(element.localName, 'html'))!;
                    const shadowCss: string = component.meta?.styles.map(s => `<style for="${s}"></style>`).join('\n') ?? '';//(await this.loadResource(element.localName, 'css'))!;

                    const result = await this.parseHtml(shadowHtml, component.meta?.properties);

                    for(const [ id, matches ] of result.map)
                    {
                        map.set(id === '__root__' ? element.localName : id, matches);
                    }
                    imports[element.localName] = component;

                    // console.log(component.files.ts);
                    // console.log(await import(component.files.ts));

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

                    if(matches)
                    {
                        for(const [ k, v ] of matches)
                        {
                            map.get('__root__')!.set(k, v);
                        }
                    }

                    // if(node.nodeType === 2 && (node as Attr).localName.endsWith('if'))
                    // {
                    //     console.log(value, matches, (node as Attr).localName, node.nodeValue);
                    // }

                    s.overwrite(
                        location.startOffset,
                        location.endOffset,
                        node.nodeType === 2
                            ? `${(node as Attr).localName}="${value}"`
                            : value!
                    );

                    break;
                }

                case 'template':
                {
                    templates.add(result.id);

                    const template: string = getTemplateInnerHtml(dom, node as HTMLTemplateElement);
                    const templateResult = await this.parseHtml(template);

                    for(const [ id, matches ] of templateResult.map)
                    {
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

    public static async loadManifest(path: string): Promise<Manifest>
    {
        const {
            name = '',
            components: comps = [],
            stylesheets = [],
            dependencies: deps = []
        }: StoredManifest = JSON.parse(await fs.readFile(Path.resolve(path, 'app.json')).then(b => b.toString()));

        const dependencies: Array<Manifest> = await Promise.all(deps.map(d => Composer.loadManifest(d)));
        const components = await comps.reduce<Promise<ComponentMap>>(
            async (components: Promise<ComponentMap>, namespace: StoredNamespace) => ({
                ...(await components),
                ...(Object.fromEntries(await arrayFromAsync(toComponent(walkDirTree(Path.resolve(path, namespace.ts)), path, namespace)))),
                ...dependencies.reduce<ComponentMap>((flattened: ComponentMap, d: Manifest) => ({ ...flattened, ...d.components }), {})
            }),
            Promise.resolve({})
        )

        return {
            name,
            dependencies,
            components,
            stylesheets,
        };
    }

    public static from(path: string): Composer
    {
        return new Composer(Composer.loadManifest(path));
    }
}