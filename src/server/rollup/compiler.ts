import * as path from 'path'
import { promises as fs } from 'fs';
import { brotliCompress, BrotliOptions } from 'zlib';
import { promisify } from 'util';
import {
    LoadResult,
    PluginContext,
    Plugin,
    AcornNode,
    NormalizedOutputOptions,
    OutputBundle,
    ResolveIdResult,
    SourceDescription, TransformResult, OutputChunk,
} from 'rollup';
import MagicString from 'magic-string';
import Composer, { ComponentMap, HtmlResult, MetaData } from '../composer.js';
import { asyncWalk as esTreeWalk, BaseNode } from 'estree-walker';

const IMPORT_PREFIX: string = 'template:';
const MAP_PLACEHOLDER: string = '__map__';

const test: Map<string, MetaData> = new Map;
const dependencies: Map<string, Array<string>> = new Map;
async function walk(context: PluginContext, id: string, code: string): Promise<MetaData>
{
    const ast = context.parse(code);

    let name: string = '';
    let styles: Array<string> = [];
    let properties: Array<string> = [];

    let imports: Map<string, string> = new Map;

    await esTreeWalk(ast, {
        async enter(node: BaseNode, parent: BaseNode)
        {
            if(node.type === 'ImportDeclaration' && parent.type === 'Program')
            {
                for(const specifier of node.specifiers)
                {
                    imports.set(specifier.local.name, node.source.value);
                }

                return;
            }

            //extract component's class name
            if(node.type === 'ClassDeclaration' && parent.type === 'ExportDefaultDeclaration')
            {
                name = node.id.name;

                const superClassName = node.superClass?.name;

                if(superClassName && imports.has(superClassName))
                {
                    const superClassFile = (await context.resolve(imports.get(superClassName)!, id))?.id!;

                    if(dependencies.has(superClassFile) === false)
                    {
                        dependencies.set(superClassFile, []);
                    }

                    dependencies.get(superClassFile)!.push(id);
                }

                return;
            }

            if(node.type === 'PropertyDefinition' && node.static === true)
            {
                switch (node.key.name)
                {
                    case 'styles':
                    {
                        styles = (node.value.elements as Array<BaseNode>)
                            .filter(el => el.type === 'Literal')
                            .map(el => el.value);
                    }
                }
            }

            if(node.type === 'PropertyDefinition' && node.static === false && node.key.name.match(/^_|#/) === null)
            {
                properties.push(node.key.name);
            }
        },
    });

    if(dependencies.has(id))
    {
        for(const dependency of dependencies.get(id)!.map(i => test.get(i)!))
        {
            dependency.properties = [ ...properties, ...dependency.properties ];
            dependency.styles = [ ...styles, ...dependency.styles ];
        }
    }

    return {
        name,
        properties,
        styles,
    };
}

class TextNode implements AcornNode
{
    type: string = 'Html';
    start: number = 0;
    end: number;

    constructor(length: number)
    {
        this.end = length;
    }

    hasEffects(): boolean
    {
        return false;
    }
}

async function loadTemplate(this: PluginContext, id: string, code: string, context: Composer): Promise<HtmlResult>
{
    // TODO(Chris Kruining) retrieve these keys from the actual page instead of hardcoded...
    const allowedKeys = [ 'whitelabel', 'listItems', 'masonryItems', 'prices', 'products' ];
    const result = await context.parseHtml(code, allowedKeys);
    const theme = await context.theme;

    const themeVariables = this.emitFile({
        type: 'asset',
        name: `variables.css`,
        source: await fs.readFile(`${theme}/variables.css`),
    });

    const themeGeneral = this.emitFile({
        type: 'asset',
        name: `general.css`,
        source: await fs.readFile(`${theme}/general.css`),
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
                <link rel="icon" href="/src/images/icon.svg">
                <link rel="apple-touch-icon" href="/src/images/icon.svg">
                
                <link rel="manifest" href="/manifest.json">
                
                <link rel="stylesheet" href="https://fyncdn.nl/node_modules/@fyn-software/suite/src/css/preload.css">
                
                <link rel="stylesheet" href="https://fyncdn.nl/node_modules/@fyn-software/suite/src/css/variables.css">
                <link rel="stylesheet" href="./{#file:${themeVariables}}">
                
                <link rel="stylesheet" href="https://fyncdn.nl/node_modules/@fyn-software/suite/src/css/style.css">
                <link rel="stylesheet" href="https://fyncdn.nl/node_modules/@fyn-software/site/src/css/style.css">
                <link rel="stylesheet" href="./{#file:${themeGeneral}}">
                <link rel="stylesheet" href="/src/css/style.css">
                <link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.13.0/css/all.css">

                <title>Unifyned • All-in-one business software</title>
                
                <!-- POLYFILLS -->
                <script type="module" src="https://unpkg.com/element-internals-polyfill"></script>
                <script type="module" src="https://fyncdn.nl/js/polyfills/declaritive-shadowroot.js"></script>

                <script type="module" src="${path.basename(id).replace('.html', '')}.js"></script>
            </head>

            <body>
    `);

    for(const [ id, code ] of result.templates)
    {
        result.code.append(`<template id="${id}">${code}</template>`);
    }

    result.code.append(`</body></html><!--`);

    cache2[id] = result;
    cache[id] = {
        ast: {
            type: 'Program',
            start: 0,
            end: result.code.length(),
            body: [
                new TextNode(result.code.length()),
            ],
            sourceType: 'module',
        } as AcornNode,
        moduleSideEffects: true,
        code: result.code.toString(),
        map: result.code.generateMap({
            source: id,
            file: `${id}.map`,
        }),
    };

    return result
}

const cache: { [key: string]: SourceDescription }  = {};
const cache2: { [key: string]: HtmlResult }  = {};
async function scriptTransform(this: PluginContext, id: string, code: string, context: Composer): Promise<any>
{
    const module = this.getModuleInfo(id);
    const component = await context.resolve(id);

    if(module === null || module.isEntry !== true || component === undefined)
    {
        return;
    }

    const magicString = new MagicString(code);

    const ast = this.parse(code);
    let importNode: BaseNode;

    await esTreeWalk(ast, {
        async enter(node: BaseNode, parent: BaseNode)
        {
            if(node.type === 'ImportDeclaration' && node.source.value.startsWith(IMPORT_PREFIX))
            {
                importNode = node;

                this.skip();
            }
        }
    });

    const htmlId = (await this.resolve(importNode.source.value.slice(IMPORT_PREFIX.length), id))!.id;
    const htmlImport = `import map from 'template:${htmlId}';`;
    const html = await context.loadResource(component.id, 'html');

    const scanned: ComponentMap = await context.scanHtml(html!);

    const imports = await Promise.all(Array.from(Object.entries(scanned), async ([ name, component ]) => {
        name = name.toPascalCase();

        const module = await this.resolve(component.files.import, id, { skipSelf: true });

        if(module !== null)
        {
            component.module = module.id;
        }

        return `\nimport ${name} from '${component.files.import}';\n${name}.define();`;
    }));

    magicString.overwrite(
        importNode.start,
        importNode.end,
        `${imports.join('')}${htmlImport}`
    );

    return {
        code: magicString.toString(),
        map: magicString.generateMap({ hires: true }),
    };
}

type CompilerOptions = {
    manifest: string
    minifyResources: boolean
};

const defaultOptions: CompilerOptions = {
    manifest: './app.json',
    minifyResources: false,
};
export default class Compiler
{
    private readonly _context: Composer;

    public constructor(options?: Partial<CompilerOptions>)
    {
        const normalizedOptions: CompilerOptions = { ...defaultOptions, ...options };

        this._context = Composer.from(normalizedOptions.manifest);
    }

    public get discover(): Plugin
    {
        const self: Compiler = this;

        return {
            name: 'discover',

            async transform(this: PluginContext, code: string, id: string): Promise<TransformResult>
            {
                const extension = id.slice(id.lastIndexOf('.') + 1);

                switch (extension)
                {
                    case 'ts':
                    {
                        return scriptTransform.call(this, id, code, self._context);
                    }

                    case 'js':
                    {
                        const component = await self._context.resolve(id);

                        test.set(id, await walk(this, id, code));

                        if(component === undefined)
                        {

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

    public get parse(): Plugin
    {
        const self: Compiler = this;

        return {
            name: 'parse',

            async load(this: PluginContext, id: string): Promise<LoadResult>
            {
                if(id.startsWith(IMPORT_PREFIX))
                {
                    return `
                        import Fragment from '@fyn-software/component/fragment.js';
                        
                        const map = {};
                        ${MAP_PLACEHOLDER}
                        
                        export default map;`;
                }

                const extension = id.slice(id.lastIndexOf('.') + 1);
                switch (extension)
                {
                    case 'html':
                    {
                        return cache[id];
                    }

                    default:
                    {
                        return;
                    }
                }
            },

            async resolveId(this: PluginContext, id: string, importer: string|undefined): Promise<ResolveIdResult>
            {
                if(id.startsWith(IMPORT_PREFIX) && importer)
                {
                    return id;
                }

                return;
            },

            async transform(this: PluginContext, code: string, id: string): Promise<TransformResult>
            {
                if(id.startsWith(IMPORT_PREFIX))
                {
                    // NOTE(Chris Kruining)
                    // This delay is a dirty hack
                    // to make sure the meta data
                    // of components is set before
                    // continuing.
                    await Promise.delay(1000);

                    const htmlId = id.slice(IMPORT_PREFIX.length);
                    const html = (await fs.readFile(htmlId)).toString() + '<poweredby no-edit=""><a href="{{ whitelabel.url }}">powered by <b>{{ whitelabel.name }}</b></a></poweredby>';

                    const magicString = new MagicString(code);
                    const toReplace = MAP_PLACEHOLDER;

                    const { templates, map } = await loadTemplate.call(this, htmlId, html, self._context);

                    // TODO(Chris Kruining)
                    //  Use Acorn to create these strings,
                    //  this is fine for now, but has weird
                    //  code formatting due to using static
                    //  strings. code generation with Acorn
                    //  should improve developer ergonomics
                    //  a lot.

                    const index = code.indexOf(toReplace);
                    const maps = Array.from(map.entries(), ([ id, matches ]) => {
                        const items = Array.from(
                            matches.entries(),
                            ([ id, { callable, directive } ]) => {
                                const func = `async callable(${callable.args}){ try { return ${callable.code}; }catch{ return undefined; } }`;

                                let dir = '';

                                if(directive)
                                {
                                    const properties = Object.entries(directive).filter(([k]) => ['type', 'fragment'].includes(k) === false).map(([ k, v]) => `${k}: ${JSON.stringify(v)}, `).join('');
                                    const fragment = directive.fragment
                                        ? ` fragment: new Fragment(templates['${directive.fragment}'], new Map(Object.entries(map['${directive.fragment}']))),`
                                        : '';

                                    dir = ` directive: { type: '${directive.type}', ${properties}${fragment} },`;
                                }

                                return `\n\t'${id}': { ${func},${dir} },`;
                            }
                        ).join('');

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

            async generateBundle(this: PluginContext, options: NormalizedOutputOptions, bundle: OutputBundle, isWrite: boolean)
            {
                for(const [ id, chunk ] of Object.entries(bundle).filter(([ id ]) => id.endsWith('.html')) as Array<[ string, OutputChunk ]>)
                {
                    chunk.code = chunk.code.replaceAll(/{#file:([a-z0-9]+?)\}/g, (w: string, ref: string) => this.getFileName(ref));
                }
            }
        };
    }
}

export function brotli(options = {}): Plugin
{
    type CompressionConfig = { map: boolean|'inline'|'hidden', options: BrotliOptions };

    const brotli = promisify(brotliCompress);
    async function brotliCompressFile(file: string, options: BrotliOptions)
    {
        await fs.writeFile(file, await brotli(await fs.readFile(file), options));
    }

    const compress = async (file: string, { map, options }: CompressionConfig) => Promise.all([
        brotliCompressFile(file, options),
        map === true && await fs.access(`${file}.map`)
            ? brotliCompressFile(`${file}.map`, options)
            : Promise.resolve(),
    ]);

    return {
        name: 'brotli',

        async writeBundle(this: PluginContext, outputOptions: NormalizedOutputOptions, bundle: OutputBundle): Promise<void>
        {
            const config: CompressionConfig = { map: outputOptions.sourcemap, options };

            if(outputOptions.file)
            {
                await compress(outputOptions.file, config);

                return;
            }
            else if(outputOptions.dir)
            {
                await Promise.all(
                    Array.from(Object.values(bundle))
                        .map(b => compress(path.join(outputOptions.dir!, b.fileName), config))
                );

                return;
            }
        }
    }
}