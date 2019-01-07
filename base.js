// eslint-disable-next-line no-unused-vars
import * as Extends from './extends.js';
import abstract from './mixins/abstract.js';

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
