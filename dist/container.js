export default class Container extends HTMLElement {
    constructor(html) {
        super();
        this._shadow = this.attachShadow({ mode: 'closed' });
        if (html !== undefined) {
            this._shadow.appendChild(DocumentFragment.fromString(html));
        }
        this.style.zIndex = '1000';
    }
    get shadow() {
        return this._shadow;
    }
}
if (window.customElements.get('fyn-container') === undefined) {
    window.customElements.define('fyn-container', Container);
}
//# sourceMappingURL=container.js.map