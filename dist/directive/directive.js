import Template, { uuidRegex } from '../template.js';
import Fragment from '../fragment.js';
export default class Directive {
    constructor(owner, scope, node, binding) {
        this._owner = owner;
        this._scope = scope;
        this._node = node;
        this._binding = binding;
    }
    get owner() {
        return this._owner;
    }
    get scope() {
        return this._scope;
    }
    get node() {
        return this._node;
    }
    get binding() {
        return this._binding;
    }
    transferTo(node) {
        // TODO(Chris Kruining)
        //  I suspect there are plenty
        //  of edge-cases which need
        //  to do more then just
        //  re-assigning the node.
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
    static async scan(node, map, allowedKeys = []) {
        const template = new DocumentFragment();
        const o = node.ownerElement;
        while (o !== null && o.childNodes.length > 0) {
            template.appendChild(o.childNodes[0]);
        }
        const [, uuid = ''] = (node.nodeValue ?? '').match(new RegExp(uuidRegex, ''));
        const mapping = map.get(uuid);
        mapping.directive = {
            type: this.type,
            fragment: await Template.cache(template, allowedKeys),
        };
        return mapping.fragment;
    }
    static async deserialize(mapping) {
        const { html, map } = await Template.deserialize(mapping.fragment);
        mapping.fragment = new Fragment(html, map);
    }
    static register(name, path) {
        this._registry.set(name, path);
    }
}
Directive._registry = new Map();
Directive._references = new WeakMap();
Directive.register('if', './if.js');
Directive.register('for', './for.js');
Directive.register('switch', './switch.js');
Directive.register('template', './template.js');
//# sourceMappingURL=directive.js.map