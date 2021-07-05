// import Composer from './composer.js';
//
// export default class Fragment<T extends IBase<T>> implements IFragment<T>
// {
//     private readonly _template: Node;
//     private readonly _map: Map<string, NewBinding>;
//
//     constructor(template: Node, map: Map<string, NewBinding>)
//     {
//         this._template = template;
//         this._map = map;
//     }
//
//     clone(): IFragment<T>
//     {
//         return new Fragment(
//             this._template.cloneNode(true),
//             new Map(this._map),
//         );
//     }
//
//     async load(): Promise<void>
//     {
//         await Promise.all(
//             Array.from(this._template.querySelectorAll(':not(:defined)'))
//                 .unique()
//                 .map(n => Composer.load(n.localName))
//         );
//     }
//
//     get template(): Node
//     {
//         return this._template;
//     }
//
//     get map(): Map<string, NewBinding>
//     {
//         return this._map;
//     }
// }