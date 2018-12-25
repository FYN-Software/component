'use strict';

import * as Extends from './extends.js';

export default class Base extends HTMLElement
{
    constructor()
    {
        if(new.target === Base)
        {
            throw new Error('Class is abstract, needs an concrete implementation to function properly');
        }

        super();

        const shadowRoot = this.attachShadow({ mode: 'open' });
        this._shadow = shadowRoot;
    }

    get shadow()
    {
        return this._shadow;
    }
}