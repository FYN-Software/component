import Binding from './binding.js';
export const uuidRegex = /{([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})}/g;
export default class Template {
    static _map = new Map;
    static _directives = {};
    static _plugins = [];
    static _directivesCache = new WeakMap();
    static _templates = new WeakMap();
    static _bindings = new WeakMap();
    static async initialize(map, directives, plugins) {
        this._map = new Map(Object.entries(map).map(([el, m]) => [el, new Map(Object.entries(m))]));
        this._directives = directives;
        this._plugins = plugins;
    }
    static async hydrate(scopes, fragment) {
        const { template, map } = fragment;
        const bindings = new Map();
        for await (const { node } of this.iterator(template)) {
            const str = node.nodeValue ?? '';
            const nodeBindings = new Set();
            for (const [tag, uuid] of Array.from(str.matchAll(uuidRegex), m => [...m])) {
                const { callable, directive } = map.get(uuid);
                if (bindings.has(uuid) === false) {
                    const binding = new Binding(tag, callable);
                    await binding.resolve(scopes);
                    bindings.set(uuid, binding);
                }
                const binding = bindings.get(uuid);
                if (directive !== undefined && node instanceof Attr) {
                    const directiveClass = this._directives[directive.type];
                    const dir = new directiveClass(node.ownerElement, binding, scopes, directive);
                    this._directivesCache.set(node, dir);
                }
                nodeBindings.add(binding);
                binding.nodes.add(node);
            }
            this._templates.set(node, str);
            this._bindings.set(node, Array.from(nodeBindings));
        }
        return { template, bindings: Array.from(bindings.values()) };
    }
    static async render(node) {
        if (this._directivesCache.has(node)) {
            return await this._directivesCache.get(node).render();
        }
        const bindings = this._bindings.get(node);
        const template = this._templates.get(node);
        const v = await (bindings.length === 1 && bindings[0].tag === template
            ? bindings[0].value
            : Promise.all(bindings.map(b => b.value.then(v => [b.tag, v])))
                .then(Object.fromEntries)
                .then(v => template.replace(uuidRegex, m => v[m])));
        if (node instanceof Attr && node.ownerElement?.hasOwnProperty(node.localName.toCamelCase())) {
            node.ownerElement[node.localName.toCamelCase()] = v;
        }
        else {
            node.nodeValue = String(v);
        }
    }
    static mapFor(component) {
        return this._map.get(component);
    }
    static getBindingsFor(node) {
        return this._bindings.get(node) ?? [];
    }
    static async processBindings(bindings, scopes) {
        await Promise.all(bindings.map(b => b.resolve(scopes)));
        await Promise.all(bindings.map(b => b.nodes)
            .reduce((t, n) => [...t, ...n], [])
            .unique()
            .map(n => Template.render(n)));
    }
    static async *iterator(node) {
        switch (node.nodeType) {
            case 1:
                const element = node;
                for (const a of Array.from(element.attributes).sort(a => a.localName.startsWith(':') ? -1 : 1)) {
                    yield* this.iterator(a);
                }
            case 11:
                for (const c of node.childNodes) {
                    yield* this.iterator(c);
                }
                break;
            case 2:
            case 3:
                if (node.nodeValue?.match(uuidRegex) !== null) {
                    yield {
                        node,
                        directive: null,
                    };
                }
                break;
        }
    }
}
//# sourceMappingURL=template.js.map