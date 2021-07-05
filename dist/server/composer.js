import { arrayFromAsync } from '../../../core/dist/functions.js';
import * as Path from 'path';
import { promises as fs } from 'fs';
import MagicString from 'magic-string';
import { JSDOM } from 'jsdom';
async function* walk(path) {
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
                    yield* walk([...path, dirent.name]);
                    break;
                }
            default:
                {
                    break;
                }
        }
    }
}
async function* toComponent(partsIterator, path, { namespace, html, css, ts }) {
    for await (const parts of partsIterator) {
        const comp = parts.splice(-1, 1)[0].replace('.ts', '');
        yield [
            [namespace, ...parts, comp].join('-'),
            {
                namespace,
                files: {
                    html: Path.resolve(path, html, ...parts, `${comp}.html`),
                    css: Path.resolve(path, css, ...parts, `${comp}.css`),
                    ts: Path.resolve(path, ts, ...parts, `${comp}.ts`),
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
    async prepareHtml(code) {
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
        for (const { 0: whole, 1: template, index = -1 } of code.matchAll(/{{\s*(.+?)\s*}}/g)) {
            const end = index + whole.length;
            s.overwrite(index, end, `{__${template}__}`);
        }
        console.log(this, code);
        return s;
    }
    static async loadManifest(path) {
        const { name = '', components: comps = [], stylesheets = [], dependencies: deps = [] } = (await import(Path.resolve(path, 'app.json'))).default;
        const dependencies = await Promise.all(deps.map(d => Composer.loadManifest(d)));
        const components = await comps.reduce(async (components, namespace) => ({
            ...(await components),
            ...(Object.fromEntries(await arrayFromAsync(toComponent(walk(Path.resolve(path, namespace.ts)), path, namespace)))),
            ...dependencies.reduce((flattened, d) => ({ ...flattened, ...d.components }), {})
        }), Promise.resolve({}));
        return {
            name,
            dependencies,
            components,
            stylesheets,
        };
    }
    static async from(path) {
        return new Composer(await Composer.loadManifest(path));
    }
}
//# sourceMappingURL=composer.js.map