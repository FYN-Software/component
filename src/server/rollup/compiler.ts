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
    SourceDescription, TransformResult,
} from 'rollup';
import MagicString from 'magic-string';
import Composer, { ComponentMap, HtmlResult } from '../composer.js';
import { walk, BaseNode } from 'estree-walker';

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
    const result = await context.parseHtml(code);
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
                <link rel="icon" href="/images/icon.svg">
                <link rel="apple-touch-icon" href="/images/icon.svg">
                
                <link rel="manifest" href="/manifest.json">
                <link rel="stylesheet" href="https://fyncdn.nl/node_modules/@fyn-software/suite/src/css/preload.css">
                <link rel="stylesheet" href="https://fyncdn.nl/node_modules/@fyn-software/suite/src/css/style.css">
                <link rel="stylesheet" href="https://fyncdn.nl/node_modules/@fyn-software/site/src/css/style.css">
                <link rel="stylesheet" href="https://fyncdn.nl/unifyned/css/variables.css">
                <link rel="stylesheet" href="https://fyncdn.nl/unifyned/css/general.css">
                <link rel="stylesheet" href="/src/css/style.css">
                <link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.13.0/css/all.css">

                <title>Unifyned • All-in-one business software</title>
                
                <!-- POLYFILLS -->
                <script type="module" src="https://unpkg.com/element-internals-polyfill"></script>
                <script type="module" src="https://fyncdn.nl/js/polyfills/declaritive-shadowroot.js"></script>

                <script type="module" src="home.js"></script>
            </head>

            <body>
    `);
    result.code.append(`</body></html>`);

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

    walk(ast, {
        enter(node: BaseNode, parent: BaseNode)
        {
            if(node.type === 'ImportDeclaration' && node.source.value.endsWith('.html'))
            {
                importNode = node;

                this.skip();
            }
        }
    });

    const htmlId = (await this.resolve(importNode.source.value, id))!.id;
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
        `${imports.join('')}\nimport map from 'template:${htmlId}';\n`
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
    private readonly _importPrefix: string = 'template:';

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
                const [ , extension ] = id.split('.');
                switch (extension)
                {
                    case 'ts':
                    {
                        return scriptTransform.call(this, id, code, self._context);
                    }

                    case 'js':
                    {
                        const component = await self._context.resolve(id);

                        if(component === undefined)
                        {
                            console.log('NO COMP', id);

                            return;
                        }

                        const ast = this.parse(code);

                        let name: string = '';
                        let styles: Array<string> = [];
                        let properties: Array<string> = [];

                        walk(ast, {
                            enter(node: BaseNode, parent: BaseNode)
                            {
                                //extract component's class name
                                if(node.type === 'ClassDeclaration' && parent.type === 'ExportDefaultDeclaration')
                                {
                                    name = node.id.name;
                                    return;
                                }

                                if(node.type === 'PropertyDefinition' && node.static === true)
                                {
                                    switch (node.key.name)
                                    {
                                        case 'styles':
                                        {
                                            // TODO(Chris Kruining)
                                            //  Components can include styles
                                            //  from their super classes,
                                            //  somehow include these instead
                                            //  of filtering them out
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

                        console.log('SET META', component.id, { name, styles, properties });

                        component.meta = { name, styles, properties };

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
                if(id.startsWith(self._importPrefix))
                {
                    return 'const map = {};\n__map__\nexport default map;';
                }

                const [ , extension ] = id.split('.');
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
                if(id.startsWith(self._importPrefix) && importer)
                {
                    return id;
                }

                return;
            },

            async transform(this: PluginContext, code: string, id: string): Promise<TransformResult>
            {
                if(id.startsWith(self._importPrefix))
                {
                    await Promise.delay(1500);

                    const htmlId = id.slice(self._importPrefix.length);
                    const html = (await fs.readFile(htmlId)).toString();

                    const magicString = new MagicString(code);
                    const toReplace = '__map__';

                    const { templates, map } = await loadTemplate.call(this, htmlId, html, self._context);

                    // TODO(Chris Kruining)
                    //  Use Acorn to create these strings,
                    //  this is fine for now, but has weird
                    //  code formatting due to using static
                    //  strings. code generation with Acorn
                    //  should improve developer ergonomics
                    //  a lot.

                    const maps = Array.from(map.entries(), ([ id, matches ]) => {
                        const items = Array.from(
                            matches.entries(),
                            ([ id, { callable, directive } ]) => {
                                const func = `async callable(${callable.args}){ return await ${callable.code}; }`;
                                const dir = directive ? ` directive: ${JSON.stringify(directive)},` : '';
                                return `\n\t'${id}': { ${func},${dir} },`;
                            }
                        ).join('');

                        return items.length > 0
                            ? `map['${id}'] = {${items}\n};\n`
                            : '';
                    })
                        .filter(p => p.length > 0)
                        .join('\n');

                    magicString.appendLeft(0, `const templates = { ${Array.from(templates.values(), t => `'${t}': document.getElementById('${t}').content`).join(',')} };\n`);
                    magicString.overwrite(code.indexOf(toReplace), code.indexOf(toReplace) + toReplace.length, maps);

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

                const [ , extension ] = id.split('.');
                switch (extension)
                {
                    case 'ts':
                    {
                        // return scriptTransform.call(this, id, code, self._context);
                    }

                    default:
                    {
                        return;
                    }
                }
            },

            async generateBundle(this: PluginContext, options: NormalizedOutputOptions, bundle: OutputBundle, isWrite: boolean): Promise<void>
            {
                // console.log('generateBundle', { options, isWrite, bundle });
            },
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