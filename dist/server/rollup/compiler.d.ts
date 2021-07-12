import { Plugin } from 'rollup';
declare type CompilerOptions = {
    manifest: string;
    minifyResources: boolean;
};
export default class Compiler {
    private readonly _context;
    private readonly _importPrefix;
    constructor(options?: Partial<CompilerOptions>);
    get discover(): Plugin;
    get parse(): Plugin;
}
export declare function brotli(options?: {}): Plugin;
export {};
//# sourceMappingURL=compiler.d.ts.map