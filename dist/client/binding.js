const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
const ARGUMENT_NAMES = /([^\s,]+)/g;
function getParamNames(func) {
    const functionString = func.toString().replace(STRIP_COMMENTS, '');
    return functionString.slice(functionString.indexOf('(') + 1, functionString.indexOf(')')).match(ARGUMENT_NAMES) ?? [];
}
export default class Binding {
    #tag;
    #keys;
    #nodes = new Set();
    #value = Promise.resolve(undefined);
    #callable;
    constructor(tag, callable) {
        this.#tag = tag;
        this.#keys = getParamNames(callable);
        this.#callable = callable;
    }
    get tag() {
        return this.#tag;
    }
    get keys() {
        return this.#keys;
    }
    get nodes() {
        return this.#nodes;
    }
    get value() {
        return this.#value;
    }
    async resolve(scopes, plugins) {
        const inverseScopes = [...scopes].reverse();
        const p = Object.fromEntries(plugins.entries);
        const args = this.#keys.map(key => {
            let val;
            for (const scope of inverseScopes) {
                if (scope.properties.hasOwnProperty(key)) {
                    val = scope.properties[key];
                }
            }
            if (val === undefined && p.hasOwnProperty(key)) {
                val = p[key];
            }
            return val;
        });
        try {
            this.#value = this.#callable.apply(scopes[0], args);
        }
        catch (e) {
            console.error(e);
        }
        return this.#value;
    }
}
//# sourceMappingURL=binding.js.map