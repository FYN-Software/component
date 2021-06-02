import Idb from '@fyn-software/core/driver/idb.js';
import plugins from './plugins.js';
import Directive from './directive/directive.js';
import Fragment from './fragment.js';
import Binding from './binding.js';
import Plugin from './plugin/plugin.js';
export const regex = /{{\s*(.+?)\s*}}/g;
export const uuidRegex = /{_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})}/g;
export default class Template {
    static async cache(fragment, allowedKeys) {
        const hash = await this.createFingerprint(fragment.innerHTML);
        const store = await this._cache;
        if ((await store.get('Cache', hash)).length !== 1) {
            const cache = new Map();
            const map = new Map();
            for await (const { node, directive } of this.iterator(fragment)) {
                node.nodeValue = (node.nodeValue ?? '').replaceAll(regex, (original, code) => {
                    if (cache.has(code) === false) {
                        const id = this.uuid();
                        const keys = allowedKeys.filter(k => code.includes(k)).unique();
                        const args = [...keys, ...plugins.keys()];
                        cache.set(code, id);
                        map.set(id, {
                            original,
                            code,
                            keys,
                            callable: {
                                args,
                                code: this.asSandboxedCodeString(args, code)
                            },
                        });
                    }
                    return `{_${cache.get(code)}}`;
                });
                if (directive !== null) {
                    await directive.scan(node, map, allowedKeys);
                }
            }
            await store.put('Cache', {
                id: hash,
                html: fragment.innerHTML,
                map,
            });
        }
        const [{ html, map }] = await store.get('Cache', hash);
        return { html, map };
    }
    static async deserialize({ html, map }) {
        const out = new Map;
        // NOTE(Chris Kruining) Deserialize stored mapping
        for (const [k, { callable: { args, code: c }, original, code, keys, directive }] of map) {
            if (directive !== undefined) {
                const d = await Directive.get(directive.type);
                await d.deserialize(directive);
            }
            out.set(k, {
                original,
                code,
                keys,
                directive,
                callable: this.asSandboxedCallable(args, c),
            });
        }
        return {
            html: DocumentFragment.fromString(html),
            map: out,
        };
    }
    static async scan(fragment, allowedKeys) {
        const item = await this.cache(fragment, allowedKeys);
        const { html, map } = await this.deserialize(item);
        return new Fragment(html, map);
    }
    static async scanSlot(slot, allowedKeys, clone = true) {
        const template = new DocumentFragment();
        for (const el of slot.assignedNodes({ flatten: true })) {
            const child = clone
                ? el.cloneNode(true)
                : el;
            template.appendChild(child);
        }
        return Template.scan(template, allowedKeys);
    }
    static async parseHtml(owner, scope, fragment, properties) {
        const { template, map } = fragment;
        const bindings = new Map();
        for await (const { node } of this.iterator(template)) {
            const str = node.nodeValue ?? '';
            const nodeBindings = new Set();
            for (const [tag, uuid] of Array.from(str.matchAll(uuidRegex), m => [...m])) {
                const { original, code, keys, callable, directive } = map.get(uuid);
                if (bindings.has(uuid) === false) {
                    const binding = new Binding(tag, original, code, keys, callable);
                    // NOTE(Chris Kruining) Test which plugins are used and add the binding to that plugin
                    await Plugin.discover(plugins, scope, binding, (...wrappedArgs) => {
                        const args = Object.entries(scope.properties)
                            .filter(([k]) => keys.includes(k))
                            .map(([, p]) => p.value);
                        return callable.apply(scope, [...args, ...wrappedArgs]);
                    });
                    await binding.resolve(scope, owner);
                    bindings.set(uuid, binding);
                }
                const binding = bindings.get(uuid);
                // NOTE(Chris Kruining)
                // To make sure structures like for
                // directives can update on a 'imported'
                // variable register a change listener
                const props = Object.keys(properties);
                for (const [, prop] of code.matchAll(/this\.([a-zA-Z_][a-zA-Z0-9_]*)/g)) {
                    if (props.includes(prop) === false) // could be `allowedKeys` ?????
                     {
                        continue;
                    }
                    owner.observe({
                        [prop]: async () => {
                            await binding.resolve(scope, owner);
                            await this.render(node);
                        },
                    });
                }
                // NOTE(Chris Kruining)
                // Detect and create directives
                if (directive !== undefined && node instanceof Attr) {
                    if (this._directives.has(node.ownerElement) === false) {
                        this._directives.set(node.ownerElement, {});
                    }
                    const directiveClass = await Directive.get(directive.type);
                    this._directives.get(node.ownerElement)[node.localName] = new directiveClass(owner, scope, node.ownerElement, binding, directive);
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
        if (node instanceof Attr
            && node.localName.startsWith(':')
            && this._directives.get(node.ownerElement)?.hasOwnProperty(node.localName)) {
            return await this._directives.get(node.ownerElement)[node.localName].render();
        }
        const bindings = this._bindings.get(node);
        const template = this._templates.get(node);
        const v = await (bindings.length === 1 && bindings[0].tag === template
            ? bindings[0].value
            : Promise.all(bindings.map(b => b.value.then(v => [b.tag, v])))
                .then(Object.fromEntries)
                .then(v => template.replace(uuidRegex, m => v[m])));
        if (typeof v === 'string' && v.startsWith('{#')) {
            console.warn(v);
        }
        // NOTE(Chris Kruining)
        //  Changed from `hasOwnProperty` to `in` I'm
        //  far from certain this is correct. CHECK IT!
        // if(node.nodeType === 2 && (node.localName.toCamelCase() in node.ownerElement))
        if (node instanceof Attr && node.ownerElement?.hasOwnProperty(node.localName.toCamelCase())) {
            node.ownerElement[node.localName.toCamelCase()] = v;
        }
        else {
            try {
                node.nodeValue = String(v);
            }
            catch (e) {
                console.dir(node);
                console.log(node, v);
                throw e;
            }
        }
    }
    static getDirectivesFor(node) {
        return this._directives.get(node);
    }
    static getDirective(ctor, node) {
        return this._directives.get(node)?.[`:${ctor.name.toLowerCase()}`];
    }
    static getBindingsFor(node) {
        return this._bindings.get(node) ?? [];
    }
    static asSandboxedCallable(keys, code) {
        try {
            return new AsyncFunction(...keys, code);
        }
        catch {
            return new AsyncFunction('return undefined;');
        }
    }
    static asSandboxedCodeString(keys, variable) {
        return `
            const sandbox = new Proxy({ Math, JSON, Date, range, ${keys.join(', ')} }, {
                has: () => true,
                get: (t, k) => k === Symbol.unscopables ? undefined : t[k],
            });
            
            try
            {
                with(sandbox)
                {
                    return await ${variable};
                }
            }
            catch
            {
                return undefined; 
            }
        `;
    }
    static async *iterator(node) {
        switch (node.nodeType) {
            case 1: // Element
                const element = node;
                // TODO(Chris Kruining) Fix this nasty hack.
                //  Maybe I could add a directive for template injection into slots?
                //  08-10-2020 :: I just checked, still in use, non the less,
                //  should implement alternative using template element
                if (element.hasAttribute('template')) {
                    element.removeAttribute('template');
                    return;
                }
                for (const a of Array.from(element.attributes).sort(a => a.localName.startsWith(':') ? -1 : 1)) {
                    yield* this.iterator(a);
                }
            /* falls through */
            case 11: // Template
                for (const c of node.childNodes) {
                    yield* this.iterator(c);
                }
                break;
            case 2: // Attribute
            case 3: // Text
                const m = node.nodeValue?.match(regex) || node.nodeValue?.match(uuidRegex);
                if (m !== null) {
                    yield {
                        node,
                        directive: node.nodeType === 2 && node.localName?.startsWith(':')
                            ? await Directive.get(node.localName?.substr(1))
                            : null
                    };
                }
                break;
        }
    }
    static uuid() {
        // NOTE(Chris Kruining)
        // This is an exemption
        // for ts-ignore due to
        // performance optimizations,
        // do NOT use elsewhere
        // @ts-ignore
        return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
    }
    static async createFingerprint(string) {
        const hash = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(string));
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
}
Template._directives = new WeakMap();
Template._templates = new WeakMap();
Template._bindings = new WeakMap();
Template._cache = new Idb('Refyned').open({ Cache: 'id' }, 1);
//# sourceMappingURL=template.js.map