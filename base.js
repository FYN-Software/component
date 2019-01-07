import * as Extends from './extends.js';
import abstract from './mixins/abstract.js';

Extends.init();

export default abstract(class Base extends HTMLElement
{
    constructor()
    {
        super();

        this._shadow = this.attachShadow({ mode: 'open' });
    }

    get shadow()
    {
        return this._shadow;
    }
});
