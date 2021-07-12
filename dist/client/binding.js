const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
const ARGUMENT_NAMES = /([^\s,]+)/g;
function getParamNames(func) {
    const functionString = func.toString().replace(STRIP_COMMENTS, '');
    return functionString.slice(functionString.indexOf('(') + 1, functionString.indexOf(')')).match(ARGUMENT_NAMES) ?? [];
}
export default class Binding {
    _tag;
    _keys;
    _code;
    _nodes = new Set();
    _value = Promise.resolve(undefined);
    _callable;
    constructor(tag, callable) {
        this._tag = tag;
        this._keys = getParamNames(callable);
        this._code = callable.toString().replace(STRIP_COMMENTS, '');
        this._callable = callable;
    }
    get tag() {
        return this._tag;
    }
    get keys() {
        return this._keys;
    }
    get code() {
        return this._code;
    }
    get nodes() {
        return this._nodes;
    }
    get value() {
        return this._value;
    }
    async resolve(scopes) {
        console.log(scopes);
        const args = scopes
            .reduce((args, scope) => args.concat(Object.entries(scope.properties)
            .filter(([k]) => this._keys.includes(k))
            .map(([, p]) => p.value)), []);
        try {
            this._value = this._callable.apply(scopes.first, args);
        }
        catch (e) {
            console.error(e);
        }
        return this._value;
    }
}
//# sourceMappingURL=binding.js.map