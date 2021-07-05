// import Template, { uuidRegex } from '../template.js';
// import Directive from './directive.js';
// import Fragment from '../fragment.js';
//
// declare type SwitchConf<T extends IBase<T>> = {
//     defaultCase: IFragment<T>,
//     cases: Map<string, IFragment<T>>,
// };
//
// export default class Switch<T extends IBase<T>> extends Directive<T>
// {
//     private readonly _defaultCase;
//     private readonly _cases;
//     private _items = [];
//     private readonly _initialized;
//
//     public constructor(owner: IBase<T>, scope: IScope<T>, node: Node, binding: IBinding<T>, { defaultCase, cases }: SwitchConf<T>)
//     {
//         super(owner, scope, node, binding);
//
//         this._defaultCase = defaultCase;
//         this._cases = cases;
//         this._initialized = this._initialize();
//     }
//
//     private async _initialize(): Promise<void>
//     {
//         this._items = [];
//
//         await Promise.all(Array.from(this._cases.values()).map(c => c.load()));
//     }
//
//     public async render()
//     {
//         const element = this.node as Element;
//
//         element.setAttribute('hidden', '');
//
//         await this._initialized;
//
//         const current = element.querySelector('[case]');
//         if(current !== null)
//         {
//             current.remove();
//         }
//
//         const value = String(await this.binding.value);
//         const fragment = this._cases.get(value) ?? this._defaultCase;
//
//         const { template, bindings } = await Template.parseHtml(this.owner, this.scope, fragment, this.owner.properties);
//
//         element.appendChild(template);
//
//         await Promise.all(bindings.map(b => b.resolve(this.scope, this.owner)));
//         await Promise.all(
//             bindings
//                 .map(b => b.nodes)
//                 .reduce((t: Array<Node>, n: Set<Node>) => [ ...t, ...n ], [])
//                 .unique()
//                 .map(n => Template.render(n))
//         );
//
//         element.removeAttribute('hidden');
//     }
//
//     public static async scan(node: Attr, map: Map<string, any>, allowedKeys: any[] = []): Promise<FragmentLike>
//     {
//         const [ , uuid ] = node.nodeValue!.match(new RegExp(uuidRegex, ''))!;
//         const mapping = map.get(uuid);
//
//         const fragment = new DocumentFragment();
//         fragment.appendChild(node.ownerElement!.querySelector(':scope > [default]') ?? document.createTextNode(''));
//         const defaultCase = await Template.cache(fragment, allowedKeys);
//
//         const cases = new Map();
//         for(const n of node.ownerElement!.querySelectorAll(':scope > [case]'))
//         {
//             const fragment = new DocumentFragment();
//             fragment.appendChild(n);
//
//             cases.set(n.getAttribute('case'), await Template.cache(fragment, allowedKeys));
//         }
//
//         mapping.directive = {
//             type: this.type,
//             defaultCase,
//             cases,
//         };
//
//         return mapping.fragment;
//     }
//
//     public static async deserialize(mapping: DirectiveCache): Promise<void>
//     {
//         const cases = new Map();
//
//         for(const [ k, c ] of mapping.cases.entries())
//         {
//             const { html, map } = await Template.deserialize(c);
//
//             cases.set(k, new Fragment(html, map))
//         }
//
//         const { html, map } = await Template.deserialize(mapping.defaultCase);
//
//         mapping.defaultCase = new Fragment(html, map);
//         mapping.cases = cases;
//     }
// }