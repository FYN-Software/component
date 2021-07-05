import * as path from 'path'
import { promises as fs } from 'fs';
import { brotliCompress, BrotliOptions } from 'zlib';
import { promisify } from 'util';
import {
    LoadResult,
    PluginContext,
    Plugin,
    RenderedChunk,
    ModuleInfo,
    AcornNode,
    NormalizedOutputOptions,
    NormalizedInputOptions,
    OutputBundle,
    ResolveIdResult,
    SourceDescription, InputOptions, MinimalPluginContext,
} from 'rollup';
import MagicString from 'magic-string';
import Composer  from '../composer.js';

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

async function loadTemplate(this: PluginContext, id: string, code: string, context: Composer): Promise<SourceDescription>
{
    console.log(code);

    const s: MagicString = await context.prepareHtml(code);

    return {
        ast: {
            type: 'Program',
            start: 0,
            end: s.length(),
            body: [
                new TextNode(s.length()),
            ],
            sourceType: 'module',
        } as AcornNode,
        moduleSideEffects: true,
        code: s.toString(),
        map: s.generateMap({
            source: id,
            file: `${id}.map`,
        }),
    };
}

async function scriptTransform(this: PluginContext, id: string, code: string, context: Composer): Promise<any>
{
    const module = await this.getModuleInfo(id);

    console.log(id, module);

    if(module === null || module.isEntry !== true)
    {
        return;
    }

    const htmlId = id.replace('.ts', '.html');
    this.emitFile({
        type: 'chunk',
        id: htmlId,
        // source: source.code,
        fileName: path.basename(htmlId),
    });

    return;
}

type CompilerOptions = {
    manifest: string
};

const defaultOptions: CompilerOptions = {
    manifest: './app.json',
};
export async function components(options?: Partial<CompilerOptions>): Promise<Plugin>
{
    const normalizedOptions: CompilerOptions = { ...defaultOptions, ...options };
    const context: Composer = await Composer.from(normalizedOptions.manifest);

    return {
        name: 'components',

        async load(this: PluginContext, id: string): Promise<LoadResult>
        {
            console.log(id);

            const [ , extension ] = id.split('.');
            switch (extension)
            {
                case 'html':
                {
                    return loadTemplate.call(this, id, (await fs.readFile(id)).toString(), context);
                }

                default:
                {
                    return;
                }
            }
        },

        async transform(this: PluginContext, code: string, id: string)
        {
            console.log(id);

            const [ , extension ] = id.split('.');
            switch (extension)
            {
                case 'ts':
                {
                    return scriptTransform.call(this, id, code, context);
                }

                default:
                {
                    return;
                }
            }
        },
    };
}

export function resolve(): Plugin
{
    return {
        name: 'resolve',
        async resolveId(this: PluginContext, importee: string, importer: string|undefined): Promise<ResolveIdResult>
        {
            if(importee.startsWith('@fyn-software') === false)
            {
                return;
            }

            if(importee.startsWith('@fyn-software/component/'))
            {
                return importee.replace(/(@fyn-software\/\w+)(.+)?/, './node_modules/$1/dist/client$2');
            }

            return importee.replace(/(@fyn-software\/\w+)(.+)?/, './node_modules/$1/dist$2');
        }
    };
}

const compress = promisify(brotliCompress);
async function brotliCompressFile(file: string, options: BrotliOptions)
{
    await fs.writeFile(file, await compress(await fs.readFile(file), options));
}

export function brotli(options = {}): Plugin
{
    type CompressionConfig = { map: boolean|'inline'|'hidden', options: BrotliOptions };

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
                        .map(b => compress(path.join(outputOptions.dir, b.fileName), config))
                );

                return;
            }
        }
    }
}