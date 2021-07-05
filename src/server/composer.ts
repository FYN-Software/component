import { arrayFromAsync } from '../../../core/dist/functions.js';
import * as Path from 'path';
import { promises as fs, Dir, Dirent } from 'fs';
import MagicString from 'magic-string';
import { JSDOM } from 'jsdom';

type StoredNamespace = {
    namespace: string;
    html: string;
    css: string;
    ts: string;
};

type StoredManifest = {
    name: string;
    dependencies?: Array<string>;
    components: Array<StoredNamespace>;
    stylesheets: Array<[ string, string ]>;
}

type TypeMap<T> = {
    html: T,
    css: T,
    ts: T,
};

type Component = {
    namespace: string;
    // resources: TypeMap<Promise<any>>;
    files: TypeMap<string>;
};
type ComponentMap = { [key: string]: Component };

type Manifest = {
    name: string;
    dependencies: Array<Manifest>;
    components: ComponentMap;
    stylesheets: Array<[ string, string ]>;
}

async function *walk(path: Array<string>|string): AsyncGenerator<Array<string>, void, void>
{
    if(typeof path === 'string')
    {
        path = [ path ];
    }

    const dir: Dir = await fs.opendir(Path.join(...path));

    for await (const dirent of dir as AsyncIterableIterator<Dirent>)
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
                yield* walk([ ...path, dirent.name]);
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
    { namespace, html, css, ts }: StoredNamespace
): AsyncGenerator<[ string, Component ], void, void>
{
    for await (const parts of partsIterator)
    {
        const comp = parts.splice(-1, 1)[0].replace('.ts', '');

        yield [
            [ namespace, ...parts, comp ].join('-'),
            {
                namespace,
                // resources: {
                //     html: fs.readFile(Path.resolve(path, html, ...parts, `${comp}.html`)),
                //     css: fs.readFile(Path.resolve(path, css, ...parts, `${comp}.css`)),
                //     ts: fs.readFile(Path.resolve(path, ts, ...parts, `${comp}.ts`)),
                // },
                files: {
                    html: Path.resolve(path, html, ...parts, `${comp}.html`),
                    css: Path.resolve(path, css, ...parts, `${comp}.css`),
                    ts: Path.resolve(path, ts, ...parts, `${comp}.ts`),
                },
            }
        ];
    }
}

export default class Composer
{
    private readonly _context: Manifest;

    public constructor(context: Manifest)
    {
        this._context = context;
    }

    public async prepareHtml(code: string): Promise<MagicString>
    {
        const s = new MagicString(code);
        s.prepend(`
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="google" content="notranslate">
                    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <meta name="description" content="fyn.nl">
                    <meta name="theme-color" content="#6e45e2">
                    <meta name="apps" content="https://KAAAAAAS.com">
                    <meta name="theme" content="https://fyncdn.nl/unifyned/css">
                    <link rel="icon" href="/images/icon.svg">
                    <link rel="apple-touch-icon" href="/images/icon.svg">
                    <link rel="manifest" href="/manifest.json">
                    <link rel="stylesheet" href="/css/style.css">
    
                    <title>Unifyned • All-in-one business software</title>
    
                    <script type="module" src="home.js"></script>
                </head>
    
                <body>
        `);
        s.append(`</body></html>`);

        console.log(new JSDOM(code));

        for(const { 0: whole, 1: template, index = -1 } of code.matchAll(/{{\s*(.+?)\s*}}/g))
        {
            const end = index + whole.length;

            s.overwrite(index, end, `{__${template}__}`);
        }

        console.log(this, code);

        return s;
    }

    public static async loadManifest(path: string): Promise<Manifest>
    {
        const { name = '', components: comps = [], stylesheets = [], dependencies: deps = [] }: StoredManifest = (await import(Path.resolve(path, 'app.json'))).default;

        const dependencies: Array<Manifest> = await Promise.all(deps.map(d => Composer.loadManifest(d)));
        const components = await comps.reduce<Promise<ComponentMap>>(
            async (components: Promise<ComponentMap>, namespace: StoredNamespace) => ({
                ...(await components),
                ...(Object.fromEntries(await arrayFromAsync(toComponent(walk(Path.resolve(path, namespace.ts)), path, namespace)))),
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

    public static async from(path: string): Promise<Composer>
    {
        return new Composer(await Composer.loadManifest(path));
    }
}