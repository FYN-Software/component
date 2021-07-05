// import lock from '@fyn-software/core/lock.js';
// import Directive from './directive.js';
// import Template, { uuidRegex } from '../template.js';
// import Base from '../base.js';
// import Component from '../component.js';
//
// declare type ForConf<T extends IBase<T>> = {
//     fragment: IFragment<T>,
//     name?: string,
//     key?: string,
// };
//
// export default class For<T extends IBase<T>> extends Directive<T>
// {
//     private static _indices = new WeakMap;
//
//     private readonly _key;
//     private readonly _name;
//     private _fragment: IFragment<T>;
//     private _items: Array<{ nodes: Array<Node>, bindings: Array<IBinding<T>> }> = [];
//     private _initialized: Promise<void>;
//
//     public constructor(owner: IBase<T>, scope: IScope<T>, node: Node, binding: IBinding<T>, { fragment, name = 'it', key = name }: ForConf<T>)
//     {
//         super(owner, scope, node, binding);
//
//         this._name = name;
//         this._key = key;
//         this._fragment = fragment;
//         this._initialized = this._initialize();
//     }
//
//     public get fragment(): IFragment<T>
//     {
//         return this._fragment;
//     }
//
//     public set fragment(fragment: IFragment<T>)
//     {
//         this._fragment = fragment;
//         this._initialized = this._initialize();
//         (this.node as Element).innerHTML = '';
//
//         void this.render();
//     }
//
//     private async _initialize(): Promise<void>
//     {
//         this._items = [];
//
//         await this._fragment.load();
//     }
//
//     public async render()
//     {
//         await this._initialized;
//
//         await lock(this, async () => {
//             const value = await this.binding.value;
//             let count: number = 0;
//
//             for await (const [ c, k, it ] of valueIterator(value))
//             {
//                 count = c + 1;
//
//                 const scope = { properties: { [this._key]: { value: k }, [this._name]: { value: it } } } as IScope<any>;
//
//                 if(this._items.length <= c)
//                 {
//                     const { template, bindings } = await Template.parseHtml(this.owner, scope, this._fragment.clone(), this.owner.properties);
//
//                     this._items.push({ nodes: Array.from<Node>(template.childNodes), bindings });
//
//                     // Wait for all components to be ready
//                     await Promise.all(
//                         Array
//                             .from(template.querySelectorAll(':defined'))
//                             .filter(el => el instanceof Component)
//                             .map(el => (el as Component<any>).isReady)
//                     );
//
//                     this.node.appendChild(template);
//                 }
//
//                 const { nodes, bindings } = this._items[c];
//
//                 for(const node of nodes)
//                 {
//                     For._indices.set(node, c);
//                 }
//
//                 // resolve values and render them.
//                 await Promise.all(bindings.map(b => b.resolve(scope, this.owner)));
//                 await Promise.all(
//                     bindings
//                         .map(b => b.nodes)
//                         .reduce((t: Array<Node>, n: Set<Node>) => [ ...t, ...n ], [])
//                         .unique()
//                         .map(n => Template.render(n))
//                 );
//             }
//
//             // Remove "overflow"
//             const toRemove = this._items.splice(count, this._items.length - count);
//
//             for(const { nodes } of toRemove)
//             {
//                 for(const node of nodes)
//                 {
//                     node.remove();
//                 }
//             }
//
//             //NOTE(Chris Kruining) with a 0 delay in order to allow the browser to actually render the results
//             await Promise.delay(0);
//
//             this.node.emit('rendered');
//         });
//     }
//
//     public static async scan(node: Attr, map: Map<string, any>)
//     {
//         const [ , uuid ] = node.nodeValue!.match(new RegExp(uuidRegex, ''))!;
//         const mapping = map.get(uuid);
//
//         const [ n, variable ] = mapping.code.split(/\s+(?:of|in)\s+/);
//         const [ name = 'it', key = name ] = n.match(/^\[?\s*(?:(\S+?)\s*(?:,|:)\s*)?\s*(\S+?)]?$/).reverse();
//         const fragment = await super.scan(node, map, [ key, name ]);
//
//         mapping.callable = {
//             args: mapping.keys,
//             code: Template.asSandboxedCodeString(mapping.keys, variable)
//         };
//         mapping.directive = {
//             ...mapping.directive,
//             name,
//             key,
//         };
//
//         return fragment;
//     }
//
//     public static async deserialize(mapping: DirectiveCache)
//     {
//         await super.deserialize(mapping);
//     }
//
//     public static get indices()
//     {
//         return this._indices;
//     }
// }
//
// async function *valueIterator(value: any): AsyncGenerator<[ number, string|number, any ], void, void>
// {
//     try
//     {
//         if (typeof value?.[Symbol.asyncIterator] === 'function')
//         {
//             let i = 0;
//             for await(const v of value)
//             {
//                 yield [i, i, v];
//
//                 i++;
//             }
//         }
//         else if (typeof value?.[Symbol.iterator] === 'function')
//         {
//             let i = 0;
//             for (const v of value)
//             {
//                 yield [i, i, v];
//
//                 i++;
//             }
//         }
//         else
//         {
//             let i = 0;
//             for await(const [k, v] of Object.entries(value ?? {}))
//             {
//                 yield [i, k, v];
//
//                 i++;
//             }
//         }
//     }
//     catch (e)
//     {
//         console.trace(value);
//         throw e;
//     }
// }