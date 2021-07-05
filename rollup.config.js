import glob from 'glob';
import typescript from 'rollup-plugin-typescript2';
import { terser } from 'rollup-plugin-terser';

function config(input) {
    return {
        input: input,
        output: {
            name: input.match(/\.\/src\/(?:.+\/)?(.+)\.ts/)[1],
            file: `dist/${input.match(/\.\/src\/(.+)\.ts/)[1]}.js`,
            format: 'esm',
            sourcemap: true,
        },
        plugins: [
            typescript({
                clean: true,
                typescript: require('typescript'),
            }),
            terser({
                compress: true,
                mangle: true,
            }),
        ],
    };
}

require('rimraf').sync('dist');

export default [
    ...glob.sync('./src/client/**/*.ts').map(config),
];
