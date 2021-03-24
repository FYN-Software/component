import '@fyn-software/core/extends.js';

export default class Container extends HTMLElement
{
    #shadow = this.attachShadow({ mode: 'closed' });

    constructor(html = null)
    {
        if(window.customElements.get('fyn-container') === undefined)
        {
            window.customElements.define('fyn-container', Container);
        }

        super();

        if(html !== null)
        {
            this.#shadow.appendChild(DocumentFragment.fromString(html));
        }

        this.style.zIndex = 1000;
    }

    get shadow()
    {
        return this.#shadow;
    }
}