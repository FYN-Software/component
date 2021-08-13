export default class Directive {
    static _registry = new Map();
    static _references = new WeakMap();
    static get type() {
        return this._references.get(this);
    }
    static async parse(template, binding, node) {
        binding.directive = {
            node,
            type: this.name.toLowerCase(),
        };
        return {
            node: node.ownerElement,
            keys: undefined,
        };
    }
}
//# sourceMappingURL=directive.js.map