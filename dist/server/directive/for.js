import Directive from './directive.js';
export default class For extends Directive {
    static async parse(binding, node) {
        const [n, variable] = binding.callable.code.split(/\s+(?:of|in)\s+/);
        if (n === undefined || variable === undefined) {
            throw new SyntaxError(`unable to parse the iterable and/or variable from '${binding.callable.code}'.`);
        }
        const match = n.match(/^\[?\s*(?:(\S+?)\s*(?:,|:)\s*)?\s*(\S+?)]?$/);
        if (match === null) {
            throw new SyntaxError(`Unable to parse variable from '${n}'`);
        }
        const [name = 'it', key = name] = match.reverse();
        const result = await super.parse(binding, node);
        result.keys = [name, key];
        binding.callable = {
            args: binding.callable.args,
            code: variable,
        };
        binding.directive = {
            ...binding.directive,
            keys: [name, key],
            name,
            key,
        };
        return result;
    }
}
//# sourceMappingURL=for.js.map