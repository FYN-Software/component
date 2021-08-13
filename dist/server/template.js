import '../../../core/dist/extends.js';
import For from './directive/for.js';
import If from './directive/if.js';
import Switch from './directive/switch.js';
import TemplateDirective from './directive/template.js';
import * as crypto from 'crypto';
const plugins = ['t'];
const directives = {
    ':for': For,
    ':if': If,
    ':switch': Switch,
    ':template': TemplateDirective,
};
export const regex = /{{\s*(.+?)\s*}}/g;
export const uuidRegex = /{([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})}/g;
export default class Template {
    static toExtract = new WeakMap;
    static async *scan(dom) {
        for await (const { type, node } of this.iterator(dom, dom.window.document.body)) {
            yield { type, node };
        }
    }
    static async *parse(dom, allowedKeys) {
        const cache = new Map();
        const matches = new Map();
        for await (const { type, location, node, directive } of this.iterator(dom, dom.window.document.body)) {
            switch (type) {
                case 'variable':
                    {
                        const attr = node;
                        const ids = [];
                        const value = (node.nodeValue ?? '').replaceAll(regex, (original, code) => {
                            if (cache.has(code) === false) {
                                const id = this.uuid();
                                const keys = allowedKeys.filter(k => code.includes(k)).unique();
                                const args = [...keys, ...(plugins)];
                                cache.set(code, id);
                                matches.set(id, { callable: { args, code } });
                            }
                            ids.push(cache.get(code));
                            return `{${cache.get(code)}}`;
                        });
                        if (directive) {
                            if (ids.length !== 1) {
                                throw new Error(`Directives expect exactly 1 template, got '${ids.length}' instead`);
                            }
                            const binding = matches.get(ids[0]);
                            const result = await directive.parse(this, binding, attr);
                            this.toExtract.set(result.node, { keys: result.keys, binding });
                        }
                        yield { type, node, directive, value, location, matches };
                        break;
                    }
                case 'template':
                    {
                        const id = this.uuid();
                        const { keys, binding } = this.toExtract.get(node) ?? { keys: undefined, binding: undefined };
                        if (binding) {
                            binding.directive.fragment = id;
                        }
                        yield { type, node, location, id, keys, };
                        break;
                    }
                case 'element':
                    {
                        yield { type, node, location, id: node.localName };
                        break;
                    }
            }
        }
    }
    static get uuidRegex() {
        return uuidRegex;
    }
    static async *iterator(dom, node) {
        const location = dom.nodeLocation(node);
        switch (node.nodeType) {
            case 1:
                if (location !== null) {
                    for (const [attr, loc] of Object.entries(location.attrs ?? {})) {
                        const attribute = node.attributes.getNamedItem(attr);
                        if (attribute.nodeValue?.match(regex) !== null) {
                            yield {
                                type: 'variable',
                                location: loc,
                                node: attribute,
                                directive: attr.startsWith(':')
                                    ? directives[attr]
                                    : undefined
                            };
                        }
                    }
                }
                if (location !== null) {
                    let type = node.nodeName === 'TEMPLATE'
                        ? 'template'
                        : 'element';
                    if (this.toExtract.has(node)) {
                        type = 'template';
                        location.startOffset = location.startTag.endOffset;
                        location.endOffset = location.endTag.startOffset;
                    }
                    yield { type, location, node };
                }
                if (this.toExtract.has(node) === false) {
                    for (const c of node.childNodes) {
                        yield* this.iterator(dom, c);
                    }
                }
                break;
            case 3:
                if (node.nodeValue?.match(regex) !== null) {
                    yield {
                        type: 'variable',
                        location,
                        node,
                    };
                }
                break;
        }
    }
    static uuid() {
        return crypto.randomUUID();
    }
    static createFingerprint(string) {
        return crypto.createHash('sha512').update(string).digest('hex');
    }
}
//# sourceMappingURL=template.js.map