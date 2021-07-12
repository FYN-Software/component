export default class Directive {
    _node;
    _binding;
    _scopes;
    get scopes() {
        return this._scopes;
    }
    get node() {
        return this._node;
    }
    get binding() {
        return this._binding;
    }
    constructor(node, binding, scopes) {
        this._node = node;
        this._binding = binding;
        this._scopes = scopes;
    }
    transferTo(node) {
        this._node = node;
    }
}
//# sourceMappingURL=directive.js.map