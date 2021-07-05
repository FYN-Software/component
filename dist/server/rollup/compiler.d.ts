import { Plugin } from 'rollup';
declare type CompilerOptions = {
    manifest: string;
};
export declare function components(options?: Partial<CompilerOptions>): Promise<Plugin>;
export declare function resolve(): Plugin;
export declare function brotli(options?: {}): Plugin;
export {};
//# sourceMappingURL=compiler.d.ts.map