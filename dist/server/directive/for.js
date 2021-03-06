import Directive from './directive.js';
export default class For extends Directive {
    static async scan(id, node, map) {
        const match = map.get(id);
        const [n, variable] = match.callable.code.split(/\s+(?:of|in)\s+/);
        const [name = 'it', key = name] = n.match(/^\[?\s*(?:(\S+?)\s*(?:,|:)\s*)?\s*(\S+?)]?$/).reverse();
        await super.scan(id, node, map, [key, name]);
        match.callable = {
            args: match.callable.args,
            code: variable,
        };
        match.directive = {
            ...match.directive,
            name,
            key,
        };
    }
}
async function* valueIterator(value) {
    try {
        if (typeof value?.[Symbol.asyncIterator] === 'function') {
            let i = 0;
            for await (const v of value) {
                yield [i, i, v];
                i++;
            }
        }
        else if (typeof value?.[Symbol.iterator] === 'function') {
            let i = 0;
            for (const v of value) {
                yield [i, i, v];
                i++;
            }
        }
        else {
            let i = 0;
            for await (const [k, v] of Object.entries(value ?? {})) {
                yield [i, k, v];
                i++;
            }
        }
    }
    catch (e) {
        console.trace(value);
        throw e;
    }
}
//# sourceMappingURL=for.js.map