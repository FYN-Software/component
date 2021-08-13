export default class Container extends HTMLElement
{
    private readonly _shadow = this.attachShadow({ mode: 'closed' });

    public constructor(creator?: () => Element)
    {
        super();

        if(creator !== undefined)
        {
            this._shadow.appendChild(creator());
        }

        this.style.zIndex = '1000';
    }

    public get shadow(): ShadowRoot
    {
        return this._shadow;
    }
}

if(window.customElements.get('fyn-container') === undefined)
{
    window.customElements.define('fyn-container', Container);
}