export default class Directive {
    static _registry = new Map();
    static _references = new WeakMap();
    static get type() {
        return this._references.get(this);
    }
    static async scan(id, node, map, allowedKeys = []) {
        const mapping = map.get(id);
        mapping.directive = {
            type: this.name.toLowerCase(),
        };
    }
}
//# sourceMappingURL=directive.js.map