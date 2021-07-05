// export default class Container extends HTMLElement
// {
//     private readonly _shadow = this.attachShadow({ mode: 'closed' });
//
//     public constructor(html?: string)
//     {
//         super();
//
//         if(html !== undefined)
//         {
//             this._shadow.appendChild(DocumentFragment.fromString(html));
//         }
//
//         this.style.zIndex = '1000';
//     }
//
//     public get shadow(): ShadowRoot
//     {
//         return this._shadow;
//     }
// }
//
// if(window.customElements.get('fyn-container') === undefined)
// {
//     window.customElements.define('fyn-container', Container);
// }