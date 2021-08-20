import { arrayFromAsync } from '../../../core/dist/functions.js';
import * as Path from 'path';
import * as https from 'https';
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
    theme?: string;
    dependencies?: Array<string>;
    components: Array<StoredNamespace>;
    stylesheets: { [key: string]: string };
}

type TypeMap<T extends Promise<string>|string = string> = {
    html: T,
    css: T,
    ts: T,
    import: T,
};

export type MetaData = {
    name: string;
    styles: Array<string>;
    properties: Array<string>;
};

type Component = {
    id: string;
    namespace: string;
    module?: string;
    meta?: MetaData;
    resources: Partial<TypeMap<Promise<string>>>;
    files: TypeMap;
};
export type ComponentMap = { [key: string]: Component };
export type StylesheetsMap = { [key: string]: string };

type Manifest = {
    name: string;
    theme?: string;
    dependencies: Array<Manifest>;
    components: ComponentMap;
    stylesheets: StylesheetsMap;
}

export type HtmlResult = {
    code: MagicString;
    map: Map<string, Map<string, CachedBinding>>;
    imports: ComponentMap;
    templates: Map<string, MagicString>;
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

function fetch(url: string): Promise<string>
{
    return new Promise<string>((resolve, reject) => {
        https.get(url, (resp) => {
            let data = '';
            resp.on('data', chunk => data += chunk);
            resp.on('end', () => resolve(data));
        }).on("error", (err) => reject(err));
    });
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
    private readonly _cache: Map<string, HtmlResult> = new Map;

    public constructor(context: Promise<Manifest>)
    {
        this._context = context;
    }

    public get components(): Promise<ComponentMap>
    {
        return this._context.then(m => m.components);
    }

    public get stylesheets(): Promise<StylesheetsMap>
    {
        return this._context.then(m => m.stylesheets);
    }

    public get theme(): Promise<string>
    {
        return this._context.then(c => c.theme ?? '');
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
                    : (node as HTMLTemplateElement).innerHTML;

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
        if(this._cache.has(code) === false)
        {
            const { components, theme } = await this._context;

            const s = new MagicString(code);
            const root = new Map;
            const map: Map<string, Map<string, CachedBinding>> = new Map([
                [ '__root__', root ],
            ]);
            const imports: ComponentMap = {};
            const templates: Map<string, MagicString> = new Map;

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

                        if(component.meta === undefined)
                        {
                            throw new Error(
                                `meta unavailable for component '${element.localName}'`
                            );
                        }

                        const shadowHtml = (await this.loadResource(element.localName, 'html'))!;
                        const shadowCss: string = (await this.loadResource(element.localName, 'css'))!;

                        const sheets = await this.stylesheets;
                        const styles = component.meta!.styles.map(s => `/*== ${s} ==*/${sheets[s]}`);
                        let themeStyle: string = '';

                        if(theme)
                        {
                            const themeStylePath = Path.resolve(theme, ...(`${element.localName}.css`).split('-'));

                            try
                            {
                                themeStyle = (await fs.readFile(themeStylePath)).toString();
                            }
                            catch
                            {
                                // NO-OP - Stupid nodejs has no file-exists anymore, try-catch is the new norm apparently...
                            }
                        }

                        const result = await this.parseHtml(shadowHtml, component.meta?.properties ?? allowedKeys);

                        for(const [ id, matches ] of result.map)
                        {
                            map.set(id === '__root__' ? element.localName : id, matches);
                        }

                        for(const template of result.templates.entries())
                        {
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

                        if(matches)
                        {
                            for(const [ k, v ] of matches)
                            {
                                root.set(k, v);
                            }
                        }

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
                        const el = node as Element;
                        let { keys } = result;
                        let match = undefined;

                        if(el.hasAttribute('for'))
                        {
                            const parentMap = map.get(el.parentElement!.localName);
                            const m = el.getAttribute('for')?.match(/^(.+)\[(:\w+)]$/);

                            if(parentMap && m)
                            {
                                const [ , query, dir ] = m;

                                for(const { directive } of parentMap.values())
                                {
                                    if(directive === undefined)
                                    {
                                        continue;
                                    }

                                    const attr = directive.node as Attr;

                                    if(attr.ownerElement?.matches(query) && attr.ownerElement?.hasAttribute(dir))
                                    {
                                        directive.fragment = result.id;

                                        match = directive;
                                    }
                                }
                            }
                        }

                        const template: string = (node as Element).innerHTML;
                        const templateResult = await this.parseHtml(template, match?.keys ?? keys ?? allowedKeys);

                        if(template.length > 0)
                        {
                            s.overwrite(location.startOffset, location.endOffset, '');
                        }

                        for(const [ id, matches ] of templateResult.map)
                        {
                            map.set(id === '__root__' ? result.id : id, matches);
                        }

                        for(const template of templateResult.templates.entries())
                        {
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

        return this._cache.get(code)!;
    }

    public static async loadManifest(path: string): Promise<Manifest>
    {
        const {
            name = '',
            theme = undefined,
            components: comps = [],
            stylesheets = {},
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

        for(const [ k, p ] of Object.entries(stylesheets))
        {
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
                .reduce((t: StylesheetsMap, d: StylesheetsMap) => ({ ...t, ...d }), {}),
        };
    }

    public static from(path: string): Composer
    {
        return new Composer(Composer.loadManifest(path));
    }
}