import * as path from 'path';
import { promises as fs } from 'fs';
import { brotliCompress } from 'zlib';
import { promisify } from 'util';
import MagicString from 'magic-string';
import Composer from '../composer.js';
import { asyncWalk as esTreeWalk } from 'estree-walker';
import { toPascalCase } from '@fyn-software/core/function/string.js';
import { delay } from '@fyn-software/core/function/promise.js';
import { unique } from '@fyn-software/core/function/array.js';
async function fileIsAvailable(path, mode) {
    try {
        await fs.access(path, mode);
        return true;
    }
    catch {
        return false;
    }
}
const IMPORT_PREFIX = 'template:';
const MAP_PLACEHOLDER = '__map__';
const test = new Map;
const dependencies = new Map;
async function walk(context, id, code) {
    const ast = context.parse(code);
    let name = '';
    let styles = [];
    let properties = [];
    let imports = new Map;
    await esTreeWalk(ast, {
        async enter(node, parent) {
            if (node.type === 'ImportDeclaration' && parent.type === 'Program') {
                for (const specifier of node.specifiers) {
                    imports.set(specifier.local.name, node.source.value);
                }
                return;
            }
            if (node.type === 'ClassDeclaration' && parent.type === 'ExportDefaultDeclaration') {
                name = node.id.name;
                const superClassName = node.superClass?.name;
                if (superClassName && imports.has(superClassName)) {
                    const superClassFile = (await context.resolve(imports.get(superClassName), id))?.id;
                    if (dependencies.has(superClassFile) === false) {
                        dependencies.set(superClassFile, []);
                    }
                    dependencies.get(superClassFile).push(id);
                }
                return;
            }
            if (node.type === 'PropertyDefinition' && node.static === true) {
                switch (node.key.name) {
                    case 'styles':
                        {
                            styles = node.value.elements
                                .filter(el => el.type === 'Literal')
                                .map(el => el.value);
                        }
                }
            }
            if (node.static === false && (node.type === 'PropertyDefinition' || node.type === 'MethodDefinition' && ['set', 'get'].includes(node.kind))) {
                properties.push(node.key.name);
            }
        },
    });
    if (dependencies.has(id)) {
        for (const dependency of dependencies.get(id).map(i => test.get(i))) {
            dependency.properties = [...unique(properties), ...dependency.properties];
            dependency.styles = [...styles, ...dependency.styles];
        }
    }
    return {
        name,
        properties,
        styles,
    };
}
class TextNode {
    type = 'Html';
    start = 0;
    end;
    constructor(length) {
        this.end = length;
    }
    hasEffects() {
        return false;
    }
}
async function loadTemplate(id, code, context) {
    const allowedKeys = [
        'company', 'listItems', 'masonryItems', 'prices', 'products',
        'product', 'categories', 'category', 'languages', 'language',
        'blockMarkets', 'customerExperiences', 'blockServices',
        'imagePartners', 'employeesFrontoffice', 'employeesBackoffice',
        'item', 'items', 'shipment', 'shipments', 'customerQuotes',
    ];
    const result = await context.parseHtml(code, allowedKeys);
    const theme = await context.theme;
    const style = this.emitFile({
        type: 'asset',
        name: 'style.css',
        source: `
            /* ===== VARS ===== */
            /* ===== suite ===== */
            ${await fs.readFile(`/var/www/apps/cdn/node_modules/@fyn-software/suite/src/css/variables.css`)}
            
            /* ===== theme ===== */
            ${theme !== '' ? await fs.readFile(`${theme}/css/variables.css`) : ''}
            
            /* ===== BASE ===== */
            /* ===== suite ===== */
            ${await fs.readFile(`/var/www/apps/cdn/node_modules/@fyn-software/suite/src/css/style.css`)}
            
            /* ===== site ===== */
            ${await fs.readFile(`/var/www/apps/cdn/node_modules/@unifyned/site/src/css/style.css`)}
            
            /* ===== theme ===== */
            ${theme !== '' ? await fs.readFile(`${theme}/css/general.css`) : ''}
            
            /* ===== OVERRIDES ===== */
            ${await fs.readFile(`./src/css/style.css`)}
        `,
    });
    result.code.prepend(`
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="google" content="notranslate">
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta name="description" content="fyn.nl">
                <meta name="theme-color" content="#6e45e2">
                <meta name="apps" content="https://unifyned.com">
                <meta name="theme" content="https://fyncdn.nl/unifyned/css">
                <link rel="icon" href="/src/img/icon.svg">
                <link rel="apple-touch-icon" href="/src/img/icon.svg">

                <title>Unifyned • All-in-one business software</title>

                <link rel="manifest" href="/manifest.json">

                <style>
                    ${await fs.readFile(`/var/www/apps/cdn/node_modules/@fyn-software/suite/src/css/preload.css`)}
                </style>

                <link rel="stylesheet" href="./{#file:${style}}">

                <script type="module" src="${path.basename(id).replace('.html', '')}.js"></script>
            </head>

            <body>
    `);
    for (const [id, code] of result.templates) {
        result.code.append(`<template id="${id}">${code}</template>`);
    }
    result.code.append(`</body></html><!--`);
    cache2[id] = result;
    return result;
}
const cache2 = {};
async function scriptTransform(id, code, context) {
    const module = this.getModuleInfo(id);
    const component = await context.resolve(id);
    if (module === null || module.isEntry !== true || component === undefined) {
        return;
    }
    const magicString = new MagicString(code);
    const ast = this.parse(code);
    let importNode;
    await esTreeWalk(ast, {
        async enter(node, parent) {
            if (node.type === 'ImportDeclaration' && node.source.value.startsWith(IMPORT_PREFIX)) {
                importNode = node;
                this.skip();
            }
        }
    });
    const htmlId = (await this.resolve(importNode.source.value.slice(IMPORT_PREFIX.length), id)).id;
    const htmlImport = `import map from 'template:${htmlId}';`;
    const html = await context.loadResource(component.id, 'html');
    const scanned = await context.scanHtml(html);
    const imports = await Promise.all(Array.from(Object.entries(scanned), async ([name, component]) => {
        name = toPascalCase(name);
        const module = await this.resolve(component.files.import, id, { skipSelf: true });
        if (module !== null) {
            component.module = module.id;
        }
        return `import ${name} from '${component.files.import}';`;
    }));
    const definitions = Array.from(Object.entries(scanned), ([name]) => `${toPascalCase(name)}.define();`);
    magicString.overwrite(importNode.start, importNode.end, `${imports.join('\n')}\n${htmlImport}`);
    magicString.appendRight(importNode.end, `${definitions.join('\n')}`);
    return {
        code: magicString.toString(),
        map: magicString.generateMap({ hires: true }),
    };
}
const defaultOptions = {
    manifest: './app.json',
    minifyResources: false,
};
export default class Compiler {
    _context;
    constructor(options) {
        const normalizedOptions = { ...defaultOptions, ...options };
        this._context = Composer.from(normalizedOptions.manifest);
    }
    get discover() {
        const self = this;
        return {
            name: 'discover',
            async transform(code, id) {
                const extension = id.slice(id.lastIndexOf('.') + 1);
                switch (extension) {
                    case 'ts':
                        {
                            return scriptTransform.call(this, id, code, self._context);
                        }
                    case 'js':
                        {
                            const component = await self._context.resolve(id);
                            test.set(id, await walk(this, id, code));
                            if (component === undefined) {
                                return;
                            }
                            component.meta = test.get(id);
                            return;
                        }
                    default:
                        {
                            return;
                        }
                }
            },
        };
    }
    get parse() {
        const self = this;
        return {
            name: 'parse',
            async load(id) {
                if (id.startsWith(IMPORT_PREFIX)) {
                    return `
                        import Fragment from '@fyn-software/component/fragment.js';
                        import { initialize } from '@fyn-software/component/template.js';
                        import For from '@fyn-software/component/directive/for.js';
                        import If from '@fyn-software/component/directive/if.js';
                        import Switch from '@fyn-software/component/directive/switch.js';
                        
                        const map = {};
                        ${MAP_PLACEHOLDER}
                        
                        await initialize(map, {
                            'for': For,
                            'if': If,
                            'switch': Switch,
                        }, [])
                        
                        export default map;`;
                }
                const extension = id.slice(id.lastIndexOf('.') + 1);
                switch (extension) {
                    case 'html':
                        {
                            const result = cache2[id];
                            return {
                                ast: {
                                    type: 'Program',
                                    start: 0,
                                    end: result.code.length(),
                                    body: [
                                        new TextNode(result.code.length()),
                                    ],
                                    sourceType: 'module',
                                },
                                moduleSideEffects: true,
                                code: result.code.toString(),
                                map: result.code.generateMap({
                                    source: id,
                                    file: `${id}.map`,
                                }),
                            };
                        }
                    default:
                        {
                            return;
                        }
                }
            },
            async resolveId(id, importer) {
                if (id.startsWith(IMPORT_PREFIX) && importer) {
                    return id;
                }
                return;
            },
            async transform(code, id) {
                if (id.startsWith(IMPORT_PREFIX)) {
                    await delay(1000);
                    const htmlId = id.slice(IMPORT_PREFIX.length);
                    const html = (await fs.readFile(htmlId)).toString() + '<poweredby no-edit=""><a href="{{ whitelabel.url }}">powered by <b>{{ whitelabel.name }}</b></a></poweredby>';
                    const magicString = new MagicString(code);
                    const toReplace = MAP_PLACEHOLDER;
                    const { templates, map } = await loadTemplate.call(this, htmlId, html, self._context);
                    const toFragment = (id) => `new Fragment(templates['${id}'], new Map(Object.entries(map['${id}'])))`;
                    const index = code.indexOf(toReplace);
                    const maps = Array.from(map.entries(), ([id, matches]) => {
                        const items = Array.from(matches.entries(), ([id, { callable, directive }]) => {
                            const func = `async callable(${callable.args}){ try { return ${callable.code}; }catch{ return undefined; } }`;
                            let dir = '';
                            if (directive) {
                                const fragments = `{ ${Array.from(directive.fragments.entries(), ([k, v]) => `'${k}': ${toFragment(v)}`).join(',')} }`;
                                const properties = Object.entries(directive)
                                    .filter(([k]) => ['type', 'fragments', 'node'].includes(k) === false)
                                    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
                                    .join(', ');
                                dir = ` directive: { type: '${directive.type}', fragments: ${fragments}, ${properties} },`;
                            }
                            return `\n\t'${id}': { ${func},${dir} },`;
                        }).join('');
                        return `map['${id}'] = {${items}\n};\n`;
                    }).reverse().join('\n');
                    magicString.appendLeft(index, `const templates = { ${Array.from(templates.keys(), t => `'${t}': document.getElementById('${t}').content`).join(',')} };\n\n`);
                    magicString.overwrite(index, index + toReplace.length, maps);
                    this.emitFile({
                        type: 'chunk',
                        id: htmlId,
                        fileName: path.basename(htmlId),
                        importer: id,
                    });
                    return {
                        code: magicString.toString(),
                        map: magicString.generateMap({}),
                    };
                }
            },
            async generateBundle(options, bundle, isWrite) {
                for (const [id, chunk] of Object.entries(bundle).filter(([id]) => id.endsWith('.html'))) {
                    chunk.code = chunk.code.replaceAll(/{#file:([a-z0-9]+?)\}/g, (w, ref) => this.getFileName(ref));
                }
            }
        };
    }
}
export function brotli(options = {}) {
    const brotli = promisify(brotliCompress);
    async function brotliCompressFile(file, options) {
        await fs.writeFile(file, await brotli(await fs.readFile(file), options));
    }
    const compress = async (file, { map, options }) => {
        return Promise.all([
            brotliCompressFile(file, options),
            map === true && await fileIsAvailable(`${file}.map`)
                ? brotliCompressFile(`${file}.map`, options)
                : Promise.resolve(),
        ]);
    };
    return {
        name: 'brotli',
        async writeBundle(outputOptions, bundle) {
            const config = { map: outputOptions.sourcemap, options };
            if (outputOptions.file) {
                await compress(outputOptions.file, config);
                return;
            }
            else if (outputOptions.dir) {
                await Promise.all(Array.from(Object.values(bundle))
                    .map(b => compress(path.join(outputOptions.dir, b.fileName), config)));
                return;
            }
        }
    };
}
//# sourceMappingURL=compiler.js.map