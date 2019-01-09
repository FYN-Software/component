import './extends.js';
import { abstract } from './mixins.js';

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
