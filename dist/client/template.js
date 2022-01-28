import ConcreteBinding from './binding.js';
import { initialize as initializePlugins } from './plugins.js';
import LocalizationPlugin, { Language } from './plugin/localization.js';
import Plugin from './plugin/plugin.js';
import { unique } from '@fyn-software/core/function/array.js';
import { toCamelCase } from '@fyn-software/core/function/string.js';
export const uuidRegex = /{([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})}/g;
let _directivesMap = new WeakMap();
let _map = new Map;
let _directives = {};
const _directivesCache = new WeakMap();
const _templates = new WeakMap();
const _bindings = new WeakMap();
const _richTextNodes = new WeakMap();
export async function initialize(map, directives) {
    _map = new Map(Object.entries(map).map(([el, m]) => [el, new Map(Object.entries(m))]));
    _directives = directives;
}
export async function hydrate(scopes, fragment) {
    const { template, map } = fragment;
    const bindings = new Map();
    for await (const { node } of iterator(template)) {
        const str = node.nodeValue ?? '';
        const nodeBindings = new Set();
        for (const [tag, uuid] of Array.from(str.matchAll(uuidRegex), m => [...m])) {
            const { callable, directive } = map.get(uuid);
            if (bindings.has(uuid) === false) {
                const binding = new ConcreteBinding(tag, callable);
                await Plugin.discover(plugins, scopes, binding, (wrappedArgs) => {
                    const scope = {
                        ...scopes
                            .map(s => s.properties)
                            .reduce((t, s) => ({ ...t, ...s }), {}),
                        ...wrappedArgs,
                    };
                    return callable.apply(scopes[0], binding.keys.map(k => scope[k]));
                });
                await binding.resolve(scopes, plugins);
                bindings.set(uuid, binding);
            }
            const binding = bindings.get(uuid);
            if (directive !== undefined && node instanceof Attr) {
                if (_directivesMap.has(node.ownerElement) === false) {
                    _directivesMap.set(node.ownerElement, {});
                }
                const directiveClass = _directives[directive.type];
                const dir = new directiveClass(node.ownerElement, binding, scopes, directive);
                _directivesMap.get(node.ownerElement)[node.localName] = dir;
                _directivesCache.set(node, dir);
            }
            nodeBindings.add(binding);
            binding.nodes.add(node);
        }
        _templates.set(node, str);
        _bindings.set(node, Array.from(nodeBindings));
    }
    return { template, bindings: Array.from(bindings.values()) };
}
export async function render(node) {
    if (_directivesCache.has(node)) {
        return await _directivesCache.get(node).render();
    }
    const bindings = _bindings.get(node);
    const template = _templates.get(node);
    const v = await (bindings.length === 1 && bindings[0].tag === template
        ? bindings[0].value
        : Promise.all(bindings.map(b => b.value.then(v => [b.tag, v])))
            .then(Object.fromEntries)
            .then(v => template.replace(uuidRegex, m => v[m])));
    if (node instanceof Attr && node.ownerElement !== null) {
        customElements.upgrade(node.ownerElement);
    }
    if (node instanceof Attr && node.ownerElement?.hasOwnProperty(toCamelCase(node.localName))) {
        node.ownerElement[toCamelCase(node.localName)] = v;
    }
    else if (node instanceof Text && v instanceof TrustedHTML) {
        if (_richTextNodes.has(node) === false) {
            const div = document.createElement('div');
            node.replaceWith(div);
            _richTextNodes.set(node, div);
        }
        _richTextNodes.get(node).innerHTML = v;
    }
    else {
        node.nodeValue = String(v ?? '');
    }
}
export function mapFor(component) {
    return _map.get(component);
}
export function getDirective(ctor, node) {
    return _directivesMap.get(node)?.[`:${ctor.name.toLowerCase()}`];
}
export function getBindingsFor(node) {
    return _bindings.get(node) ?? [];
}
export async function processBindings(bindings, scopes) {
    await Promise.all(bindings.map(b => b.resolve(scopes, plugins)));
    await Promise.all(unique(bindings.map(b => b.nodes).reduce((t, n) => [...t, ...n], [])).map(n => render(n)));
}
async function* iterator(node) {
    switch (node.nodeType) {
        case 1:
            const element = node;
            for (const a of Array.from(element.attributes).sort(a => a.localName.startsWith(':') ? -1 : 1)) {
                yield* iterator(a);
            }
        case 11:
            for (const c of node.childNodes) {
                yield* iterator(c);
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
export const plugins = initializePlugins({
    localization: new LocalizationPlugin(processBindings, Language.English),
});
//# sourceMappingURL=template.js.map