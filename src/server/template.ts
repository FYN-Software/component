import '../../../core/dist/extends.js';
import For from './directive/for.js';
import If from './directive/if.js';
import Switch from './directive/switch.js';
import TemplateDirective from './directive/template.js';
import * as crypto from 'crypto';
import { JSDOM } from 'jsdom';

const plugins = [ 't' ];
const directives: { [key: string]: DirectiveConstructor } = {
    ':for': For as DirectiveConstructor,
    ':if': If,
    ':switch': Switch,
    ':template': TemplateDirective,
};

export const regex: RegExp = /{{\s*(.+?)\s*}}/g;
export const uuidRegex: RegExp = /{([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})}/g;

type ElementResult = {
    type: 'element';
    location: any,
    node: Node;
    id: string;
};

type TemplateResult = {
    type: 'template';
    location: any,
    node: Node;
    id: string;
};

type VariableResult = {
    type: 'variable';
    location: any,
    node: Node;
    value: string;
    matches: Map<string, CachedBinding>;
    directive?: DirectiveConstructor;
};

type Result = ElementResult|TemplateResult|VariableResult;

type IteratorResult = {
    type: Result['type']
    location: any,
    node: Node;
    directive?: DirectiveConstructor;
};

export default class Template
{
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
                    const value = (node.nodeValue ?? '').replaceAll(regex, (original: string, code: string) => {
                        if(cache.has(code) === false)
                        {
                            const id = this.uuid();
                            const keys = allowedKeys.filter(k => code.includes(k)).unique();
                            const args = [ ...keys, ...(plugins) ];

                            cache.set(code, id);
                            matches.set(id, { callable: { args, code } });

                            if(directive)
                            {
                                directive.scan(id, node as Attr, matches);
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

                    yield {
                        type: node.nodeName === 'TEMPLATE'
                            ? 'template'
                            : 'element',
                        location,
                        node,
                    };
                }

                for(const c of node.childNodes)
                {
                    yield* this.iterator(dom, c);
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

    private static uuid()
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