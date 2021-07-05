// import Template, { uuidRegex } from '../template.js';
// import Fragment from '../fragment.js';
//
// export default abstract class Directive<T extends IBase<T>> implements IDirective<T>
// {
//     private static _registry: Map<string, string> = new Map();
//     private static _references: WeakMap<DirectiveConstructor<any>, string> = new WeakMap();
//
//     private _owner: IBase<T>;
//     private _scope: IScope<T>;
//     private _node: Node;
//     private _binding: IBinding<T>;
//
//     public get owner(): IBase<T>
//     {
//         return this._owner;
//     }
//
//     public get scope(): IScope<T>
//     {
//         return this._scope;
//     }
//
//     public get node(): Node
//     {
//         return this._node;
//     }
//
//     public get binding(): IBinding<T>
//     {
//         return this._binding;
//     }
//
//     protected constructor(owner: IBase<T>, scope: IScope<T>, node: Node, binding: IBinding<T>)
//     {
//         this._owner = owner;
//         this._scope = scope;
//         this._node = node;
//         this._binding = binding;
//     }
//
//     public transferTo(node: Node): void
//     {
//         // TODO(Chris Kruining)
//         //  I suspect there are plenty
//         //  of edge-cases which need
//         //  to do more then just
//         //  re-assigning the node.
//
//         this._node = node;
//     }
//
//     abstract render(): Promise<void>;
//
//     static get type(): string|undefined
//     {
//         return this._references.get(this as unknown as DirectiveConstructor<any>);
//     }
//
//     public static async get<T extends IBase<T>>(name: string): Promise<DirectiveConstructor<T>>
//     {
//         if(this._registry.has(name) === false)
//         {
//             throw new Error(`Directive with name '${name}' is not registered, you can do so by calling "Directive.register('name-of-directive', 'path/to/directive')"`);
//         }
//
//         const directive: DirectiveConstructor<T> = (await import(this._registry.get(name)!)).default ?? null;
//
//         this._references.set(directive, name);
//
//         return directive;
//     }
//
//     public static async scan(node: Attr, map: Map<string, any>, allowedKeys: Array<string> = []): Promise<FragmentLike>
//     {
//         const template = new DocumentFragment();
//         const o = node.ownerElement;
//
//         while(o !== null && o.childNodes.length > 0)
//         {
//             template.appendChild(o.childNodes[0]);
//         }
//
//         const [ , uuid = '' ] = (node.nodeValue ?? '').match(new RegExp(uuidRegex, ''))!;
//         const mapping = map.get(uuid);
//         mapping.directive = {
//             type: this.type,
//             fragment: await Template.cache(template, allowedKeys),
//         };
//
//         return mapping.fragment;
//     }
//
//     public static async deserialize(mapping: DirectiveCache): Promise<void>
//     {
//         const { html, map } = await Template.deserialize(mapping.fragment);
//
//         mapping.fragment = new Fragment(html, map);
//     }
//
//     static register(name: string, path: string)
//     {
//         this._registry.set(name, path);
//     }
// }
//
// Directive.register('if', './if.js');
// Directive.register('for', './for.js');
// Directive.register('switch', './switch.js');
// Directive.register('template', './template.js');