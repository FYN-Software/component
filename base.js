import * as Extends from './extends.js';
import abstract from './mixins/abstract.js';

export default abstract(class Base extends HTMLElement
{
    constructor()
    {
        super();

        const shadowRoot = this.attachShadow({ mode: 'open' });
        this._shadow = shadowRoot;
    }

    get shadow()
    {
        return this._shadow;
    }
})