import '../../../core/dist/extends.js';
import For from './directive/for.js';
import If from './directive/if.js';
import Switch from './directive/switch.js';
import TemplateDirective from './directive/template.js';
import * as crypto from 'crypto';
import { JSDOM } from 'jsdom';

const plugins = [ 't' ];
const directives: { [key: string]: DirectiveConstructor } = {
    ':for': For,
    ':if': If,
    ':switch': Switch,
    ':template': TemplateDirective,
};

export const regex: RegExp = /{{\s*(.+?)\s*}}/g;
export const uuidRegex: RegExp = /{([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})}/g;

type IteratorResult = {
    type: Result['type']
    location: any,
    node: Node;
    directive?: DirectiveConstructor;
};

type ExtractionContext = { keys?: Array<string>, binding: CachedBinding };

export default class Template implements ITemplate
{
    private static toExtract: WeakMap<Node, ExtractionContext> = new WeakMap;

    public static async *scan(dom: JSDOM): AsyncGenerator<{ type: Result['type'], node: Node }, void>
    {
        for await (const { type, node } of this.iterator(dom, dom.window.document.body))
        {
            yield { type, node };
        }
    }

    public static async *parse(dom: JSDOM, allowedKeys: Array<string>): AsyncGenerator<Result, void>
    {
        const cache: Map<string, string> = new Map();
        const matches: Map<string, CachedBinding> = new Map();

        for await (const { type, location, node, directive } of this.iterator(dom, dom.window.document.body))
        {
            switch (type)
            {
                case 'variable':
                {
                    const attr = node as Attr;
                    const ids: Array<string> = [];
                    const value = (node.nodeValue ?? '').replaceAll(regex, (original: string, code: string) => {
                        if(cache.has(code) === false)
                        {
                            const id = this.uuid();
                            const keys = allowedKeys.filter(k => code.includes(k)).unique();
                            const args = [ ...keys, ...(plugins) ];

                            cache.set(code, id);
                            matches.set(id, { callable: { args, code } });
                        }

                        ids.push(cache.get(code)!);

                        return `{${cache.get(code)}}`;
                    });

                    if(directive)
                    {
                        if(ids.length !== 1)
                        {
                            throw new Error(`Directives expect exactly 1 template, got '${ids.length}' instead`)
                        }

                        const binding = matches.get(ids[0])!;
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

                    if(binding)
                    {
                        binding.directive!.fragment = id;
                    }

                    yield { type, node, location, id, keys, };

                    break;
                }

                case 'element':
                {
                    yield { type, node, location, id: (node as Element).localName };

                    break;
                }
            }
        }
    }

    public static get uuidRegex()
    {
        return uuidRegex;
    }

    private static async *iterator<T extends IBase<T>>(dom: JSDOM, node: Node): AsyncGenerator<IteratorResult, void, void>
    {
        const location = dom.nodeLocation(node);

        switch(node.nodeType)
        {
            case 1: // Element
                // Iterate attributes
                if(location !== null)
                {
                    for(const [ attr, loc ] of Object.entries(location.attrs ?? {}))
                    {
                        const attribute: Attr = (node as Element).attributes.getNamedItem(attr)!;

                        if(attribute.nodeValue?.match(regex) !== null)
                        {
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

                // yield the node itself
                if(location !== null)
                {
                    let type: IteratorResult['type'] = node.nodeName === 'TEMPLATE'
                        ? 'template'
                        : 'element'

                    if(this.toExtract.has(node))
                    {
                        const loc = clone(location);
                        loc.startOffset = location.startTag.endOffset;
                        loc.endOffset = location.endTag.startOffset;

                        yield { type: 'template', location: loc, node };
                    }

                    yield { type, location, node };
                }

                // Iterate children
                if(this.toExtract.has(node) === false)
                {
                    for(const c of node.childNodes)
                    {
                        yield* this.iterator(dom, c);
                    }
                }

                break;

            case 3: // Text
                if(node.nodeValue?.match(regex) !== null)
                {
                    yield {
                        type: 'variable',
                        location,
                        node,
                    };
                }

                break;
        }
    }

    public static uuid()
    {
        return crypto.randomUUID();

        // // NOTE(Chris Kruining)
        // // This is an exemption
        // // for ts-ignore due to
        // // performance optimizations,
        // // do NOT use elsewhere
        // // @ts-ignore
        // return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
    }

    private static createFingerprint(string: string): string
    {
        return crypto.createHash('sha512').update(string).digest('hex');

        // const hash = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(string));
        //
        // return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
}