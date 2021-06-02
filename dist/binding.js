import plugins from './plugins.js';
export default class Binding {
    constructor(tag, original, expression, keys, callable) {
        this._nodes = new Set();
        this._value = Promise.resolve(undefined);
        this._tag = tag;
        this._original = original;
        this._expression = expression;
        this._keys = keys;
        this._callable = callable;
    }
    get tag() {
        return this._tag;
    }
    get expression() {
        return this._expression;
    }
    get original() {
        return this._original;
    }
    get keys() {
        return this._keys;
    }
    get nodes() {
        return this._nodes;
    }
    get value() {
        return this._value;
    }
    async resolve(scope, self) {
        const args = [
            ...Object.entries(scope.properties)
                .filter(([k]) => this._keys.includes(k))
                .map(([, p]) => p.value),
            ...plugins.values(),
        ];
        try {
            this._value = this._callable.apply(self ?? scope, args);
        }
        catch (e) {
            console.error(e);
        }
        return this._value;
    }
}
//# sourceMappingURL=binding.js.map