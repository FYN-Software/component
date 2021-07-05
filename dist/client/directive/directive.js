export default class Directive {
    static _registry = new Map();
    static _references = new WeakMap();
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
    static get type() {
        return this._references.get(this);
    }
    static async get(name) {
        if (this._registry.has(name) === false) {
            throw new Error(`Directive with name '${name}' is not registered, you can do so by calling "Directive.register('name-of-directive', 'path/to/directive')"`);
        }
        const directive = (await import(this._registry.get(name))).default ?? null;
        this._references.set(directive, name);
        return directive;
    }
    static register(name, path) {
        this._registry.set(name, path);
    }
}
Directive.register('if', './if.js');
Directive.register('for', './for.js');
Directive.register('switch', './switch.js');
Directive.register('template', './template.js');
//# sourceMappingURL=directive.js.map