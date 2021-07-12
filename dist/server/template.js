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
                        const value = (node.nodeValue ?? '').replaceAll(regex, (original, code) => {
                            if (cache.has(code) === false) {
                                const id = this.uuid();
                                const keys = allowedKeys.filter(k => code.includes(k)).unique();
                                const args = [...keys, ...(plugins)];
                                cache.set(code, id);
                                matches.set(id, { callable: { args, code } });
                                if (directive) {
                                    directive.scan(id, node, matches);
                                }
                            }
                            return `{${cache.get(code)}}`;
                        });
                        yield { type, node, directive, value, location, matches };
                        break;
                    }
                case 'template':
                    {
                        yield { type, node, location, id: this.uuid() };
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
                    yield {
                        type: node.nodeName === 'TEMPLATE'
                            ? 'template'
                            : 'element',
                        location,
                        node,
                    };
                }
                for (const c of node.childNodes) {
                    yield* this.iterator(dom, c);
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