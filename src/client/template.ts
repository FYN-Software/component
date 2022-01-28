import ConcreteBinding from './binding.js';
import { initialize as initializePlugins } from './plugins.js';
import LocalizationPlugin, { Language } from './plugin/localization.js';
import Plugin from './plugin/plugin.js';
import { unique } from '@fyn-software/core/function/array.js';
import { toCamelCase } from '@fyn-software/core/function/string.js';

export type DirectiveMap = { [key: string]: Constructor<IDirective<any>> };

export const uuidRegex: RegExp = /{([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})}/g;

let _directivesMap: WeakMap<Node, { [key: string]: IDirective<any> }> = new WeakMap();
let _map: Map<string, Map<string, Binding>> = new Map;
let _directives: DirectiveMap = {};
const _directivesCache: WeakMap<Node, IDirective<IBase<any>>> = new WeakMap();
const _templates: WeakMap<Node, string> = new WeakMap();
const _bindings: WeakMap<Node, Array<IBinding<any>>> = new WeakMap();
const _richTextNodes: WeakMap<Node, Element> = new WeakMap();

export async function initialize(map: { [key: string]: { [key: string]: Binding } }, directives: DirectiveMap): Promise<void>
{
    _map = new Map(
        Object.entries(map).map(([ el, m ]) => [ el, new Map(Object.entries(m)) ])
    );
    _directives = directives;
}

export async function hydrate<T extends IBase<T>>(scopes: Array<IScope>, fragment: IFragment<T>): Promise<ParsedTemplate<T>>
{
    const { template, map } = fragment;
    const bindings: Map<string, IBinding<T>> = new Map();

    for await (const { node } of iterator<T>(template))
    {
        const str = node.nodeValue ?? '';
        const nodeBindings: Set<IBinding<T>> = new Set();

        for(const [ tag, uuid ] of Array.from(str.matchAll(uuidRegex), m => [ ...m ]))
        {
            const { callable, directive } = map.get(uuid)!;

            if(bindings.has(uuid) === false)
            {
                const binding = new ConcreteBinding<T>(tag, callable);

                // NOTE(Chris Kruining) Test which plugins are used and add the binding to that plugin
                await Plugin.discover(plugins, scopes, binding, (wrappedArgs: { [p: string]: IPlugin }) => {
                    type scope = { [key: string]: any };
                    const scope = {
                        ...scopes
                            .map<scope>(s => s.properties)
                            .reduce((t: scope, s: scope) => ({ ...t, ...s }), {}),
                        ...wrappedArgs,
                    };

                    return callable.apply(scopes[0], binding.keys.map(k => scope[k]));
                });

                await binding.resolve(scopes, plugins);

                bindings.set(uuid, binding);
            }

            const binding = bindings.get(uuid)!;

            // TODO(Chris Kruining) Implement observers of scoped properties

            // NOTE(Chris Kruining)
            // Detect and create directives
            if(directive !== undefined && node instanceof Attr)
            {
                if(_directivesMap.has(node.ownerElement!) === false)
                {
                    _directivesMap.set(node.ownerElement!, {});
                }

                const directiveClass = _directives[directive.type];
                const dir = new directiveClass(node.ownerElement, binding, scopes, directive);

                _directivesMap.get(node.ownerElement!)![node.localName] = dir;
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

export async function render<T extends IBase<T>>(node: Node): Promise<void>
{
    if(_directivesCache.has(node))
    {
        return await _directivesCache.get(node)!.render();
    }

    const bindings = _bindings.get(node)!;
    const template = _templates.get(node)!;
    const v: any = await (bindings.length === 1 && bindings[0].tag === template
            ? bindings[0].value
            : Promise.all(bindings.map(b => b.value.then(v => [ b.tag, v ])))
                .then(Object.fromEntries)
                .then(v => template.replace(uuidRegex, m => v[m]))
    );

    if(node instanceof Attr && node.ownerElement !== null)
    {
        customElements.upgrade(node.ownerElement);
    }

    if(node instanceof Attr && node.ownerElement?.hasOwnProperty(toCamelCase(node.localName)))
    {
        (node.ownerElement as T)[toCamelCase(node.localName) as keyof T] = v;
    }
    else if(node instanceof Text && v instanceof TrustedHTML)
    {
        if(_richTextNodes.has(node) === false)
        {
            const div = document.createElement('div');
            node.replaceWith(div);

            _richTextNodes.set(node, div);
        }

        _richTextNodes.get(node)!.innerHTML = v;
    }
    else
    {
        node.nodeValue = String(v ?? '');
    }
}

export function mapFor(component: string): Map<string, Binding>|undefined
{
    return _map.get(component);
}

export function getDirective<TDirective extends IDirective<any>>(ctor: Constructor<IDirective<any>>, node: Node): TDirective|undefined
{
    return _directivesMap.get(node)?.[`:${ctor.name.toLowerCase()}`] as TDirective|undefined;
}

export function getBindingsFor(node: Node): Array<IBinding<any>>
{
    return _bindings.get(node) ?? [];
}

export async function processBindings<T extends IBase<T>>(bindings: Array<IBinding<T>>, scopes: Array<IScope>): Promise<void>
{
    await Promise.all(bindings.map(b => b.resolve(scopes, plugins)));
    await Promise.all(
        unique(bindings.map(b => b.nodes).reduce((t: Array<Node>, n: Set<Node>) => [ ...t, ...n ], [])).map(n => render(n))
    );
}

async function* iterator<T extends IBase<T>>(node: Node): AsyncGenerator<{ node: Node, directive: DirectiveConstructor|null }, void, void>
{
    switch(node.nodeType)
    {
        case 1: // Element
            const element = node as Element;

            for(const a of Array.from(element.attributes).sort(a => a.localName.startsWith(':') ? -1 : 1))
            {
                yield* iterator(a);
            }

        /* falls through */
        case 11: // DocumentFragment
            for(const c of node.childNodes)
            {
                yield* iterator(c);
            }

            break;

        case 2: // Attribute
        case 3: // Text
            if(node.nodeValue?.match(uuidRegex) !== null)
            {
                yield {
                    node,
                    directive: null,
                    // directive: node.nodeType === 2 && (node as Attr).localName?.startsWith(':')
                    //     ? await Directive.get<T>((node as Attr).localName?.substr(1))
                    //     : null,
                };
            }

            break;
    }
}

export const plugins = initializePlugins({
    localization: new LocalizationPlugin(processBindings, Language.English),
});
