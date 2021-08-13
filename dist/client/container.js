export default class Container extends HTMLElement {
    _shadow = this.attachShadow({ mode: 'closed' });
    constructor(creator) {
        super();
        if (creator !== undefined) {
            this._shadow.appendChild(creator());
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