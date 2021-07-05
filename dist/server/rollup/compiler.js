import * as path from 'path';
import { promises as fs } from 'fs';
import { brotliCompress } from 'zlib';
import { promisify } from 'util';
import Composer from '../composer.js';
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
    console.log(code);
    const s = await context.prepareHtml(code);
    return {
        ast: {
            type: 'Program',
            start: 0,
            end: s.length(),
            body: [
                new TextNode(s.length()),
            ],
            sourceType: 'module',
        },
        moduleSideEffects: true,
        code: s.toString(),
        map: s.generateMap({
            source: id,
            file: `${id}.map`,
        }),
    };
}
async function scriptTransform(id, code, context) {
    const module = await this.getModuleInfo(id);
    console.log(id, module);
    if (module === null || module.isEntry !== true) {
        return;
    }
    const htmlId = id.replace('.ts', '.html');
    this.emitFile({
        type: 'chunk',
        id: htmlId,
        fileName: path.basename(htmlId),
    });
    return;
}
const defaultOptions = {
    manifest: './app.json',
};
export async function components(options) {
    const normalizedOptions = { ...defaultOptions, ...options };
    const context = await Composer.from(normalizedOptions.manifest);
    return {
        name: 'components',
        async load(id) {
            console.log(id);
            const [, extension] = id.split('.');
            switch (extension) {
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
        async transform(code, id) {
            console.log(id);
            const [, extension] = id.split('.');
            switch (extension) {
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
export function resolve() {
    return {
        name: 'resolve',
        async resolveId(importee, importer) {
            if (importee.startsWith('@fyn-software') === false) {
                return;
            }
            if (importee.startsWith('@fyn-software/component/')) {
                return importee.replace(/(@fyn-software\/\w+)(.+)?/, './node_modules/$1/dist/client$2');
            }
            return importee.replace(/(@fyn-software\/\w+)(.+)?/, './node_modules/$1/dist$2');
        }
    };
}
const compress = promisify(brotliCompress);
async function brotliCompressFile(file, options) {
    await fs.writeFile(file, await compress(await fs.readFile(file), options));
}
export function brotli(options = {}) {
    const compress = async (file, { map, options }) => Promise.all([
        brotliCompressFile(file, options),
        map === true && await fs.access(`${file}.map`)
            ? brotliCompressFile(`${file}.map`, options)
            : Promise.resolve(),
    ]);
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