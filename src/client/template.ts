// import plugins from './plugins.js';
import Directive from './directive/directive.js';
import Binding from './binding.js';
// import Plugin from './plugin/plugin.js';

export const uuidRegex: RegExp = /{([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})}/g;

export default class Template
{
    private static _directives: WeakMap<Node, IDirectiveMap> = new WeakMap();
    private static _directivesCache: WeakMap<Node, IDirective<IBase<any>>> = new WeakMap();
    private static _templates: WeakMap<Node, string> = new WeakMap();
    private static _bindings: WeakMap<Node, Array<IBinding<any>>> = new WeakMap();
    private static _map: Map<string, Map<string, NewBinding>> = new Map;

    static async initialize(map: { [key: string]: { [key: string]: NewBinding } }): Promise<void>
    {
        this._map = new Map(
            Object.entries(map).map(([ el, m ]) => [ el, new Map(Object.entries(m)) ])
        );
    }

    static async hydrate<T extends IBase<T>>(scopes: Array<IScope>, fragment: IFragment<T>): Promise<ParsedTemplate<T>>
    {
        const { template, map } = fragment;
        const bindings: Map<string, IBinding<T>> = new Map();

        for await (const { node } of this.iterator<T>(template))
        {
            const str = node.nodeValue ?? '';
            const nodeBindings: Set<IBinding<T>> = new Set();

            for(const [ tag, uuid ] of Array.from(str.matchAll(uuidRegex), m => [ ...m ]))
            {
                const { callable, directive } = map.get(uuid)!;

                if(bindings.has(uuid) === false)
                {
                    const binding = new Binding<T>(tag, callable);

                    // NOTE(Chris Kruining) Test which plugins are used and add the binding to that plugin
                    // await Plugin.discover<T>(plugins as Array<IPlugin>, scopes, binding, (...wrappedArgs: Array<any>) => {
                    //     const args = scopes.reduce(
                    //         (args: Array<any>, scope: IScope) => args.concat(
                    //             Object.entries<ViewModelField<T[keyof T]>>(scope.properties)
                    //                 .filter(([ k ]) => binding.keys.includes(k))
                    //                 .map(([ , p ]) => p.value)
                    //         ),
                    //         []
                    //     );
                    //
                    //     return callable.apply(scopes.last, [ ...args, ...wrappedArgs ]);
                    // });

                    await binding.resolve(scopes);

                    bindings.set(uuid, binding);
                }

                const binding = bindings.get(uuid)!;

                // TODO(Chris Kruining) Implement observers of scoped properties

                // NOTE(Chris Kruining)
                // Detect and create directives
                if(directive !== undefined && node instanceof Attr)
                {
                    if(this._directives.has(node.ownerElement!) === false)
                    {
                        this._directives.set(node.ownerElement!, {});
                    }

                    const directiveClass = await Directive.get(directive.type);
                    const dir = new directiveClass(node.ownerElement, binding, scopes, directive);

                    this._directives.get(node.ownerElement!)![node.localName] = dir;
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

    static async render<T extends IBase<T>>(node: Node): Promise<void>
    {
        if(this._directivesCache.has(node))
        {
            return await this._directivesCache.get(node)!.render();
        }

        const bindings = this._bindings.get(node)!;
        const template = this._templates.get(node)!;
        const v: any = await (bindings.length === 1 && bindings[0].tag === template
                ? bindings[0].value
                : Promise.all(bindings.map(b => b.value.then(v => [ b.tag, v ])))
                    .then(Object.fromEntries)
                    .then(v => template.replace(uuidRegex, m => v[m]))
        );

        if(node instanceof Attr && node.ownerElement?.hasOwnProperty(node.localName.toCamelCase()))
        {
            (node.ownerElement as T)[node.localName.toCamelCase() as keyof T] = v;
        }
        else
        {
            node.nodeValue = String(v);
        }
    }

    public static mapFor(component: string): Map<string, NewBinding>|undefined
    {
        return this._map.get(component);
    }

    public static getDirective<TDirective extends IDirective<T>, T extends IBase<T>>(ctor: DirectiveConstructor<T>, node: Node): TDirective|undefined
    {
        return this._directives.get(node)?.[`:${ctor.name.toLowerCase()}`] as TDirective|undefined;
    }

    public static getBindingsFor(node: Node): Array<IBinding<any>>
    {
        return this._bindings.get(node) ?? [];
    }

    public static async processBindings<T extends IBase<T>>(bindings: Array<IBinding<T>>, scopes: Array<IScope>): Promise<void>
    {
        await Promise.all(bindings.map(b => b.resolve(scopes)));
        await Promise.all(
            bindings.map(b => b.nodes)
                .reduce((t: Array<Node>, n: Set<Node>) => [ ...t, ...n ], [])
                .unique()
                .map(n => Template.render(n))
        );
    }

    private static async *iterator<T extends IBase<T>>(node: Node): AsyncGenerator<{ node: Node, directive: DirectiveConstructor<T>|null }, void, void>
    {
        switch(node.nodeType)
        {
            case 1: // Element
                const element = node as Element;

                for(const a of Array.from(element.attributes).sort(a => a.localName.startsWith(':') ? -1 : 1))
                {
                    yield* this.iterator(a);
                }

            /* falls through */
            case 11: // Template
                for(const c of node.childNodes)
                {
                    yield* this.iterator(c);
                }

                break;

            case 2: // Attribute
            case 3: // Text
                if(node.nodeValue?.match(uuidRegex) !== null)
                {
                    yield {
                        node,
                        directive: node.nodeType === 2 && (node as Attr).localName?.startsWith(':')
                            ? await Directive.get<T>((node as Attr).localName?.substr(1))
                            : null
                    };
                }

                break;
        }
    }
}