import * as Rollup from 'rollup';
console.log(Rollup);
class Compiler {
    static defaultOptions = {};
    name = 'FYN Software component compiler';
    _options;
    constructor(options) {
        this._options = { ...Compiler.defaultOptions, options };
    }
    async options(options) {
        console.log(options);
    }
    async resolveId(id, importer) {
        console.log('source', id, importer);
        return;
    }
    async load(id) {
        console.log(`id:: '${id}'`);
        return;
    }
}
export function compiler(options) {
    return {
        name: 'FYN Software component compiler',
    };
}
//# sourceMappingURL=compiler.js.map