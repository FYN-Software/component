export default class Container extends HTMLElement
{
    #shadow = this.attachShadow({ mode: 'closed' });

    constructor()
    {
        if(window.customElements.get('fyn-container') === undefined)
        {
            window.customElements.define('fyn-container', Container);
        }

        super();

        this.style.zIndex = 100;
    }

    get shadow()
    {
        return this.#shadow;
    }
}