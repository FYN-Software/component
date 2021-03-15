export default class Trigger extends EventTarget
{
    #component;

    constructor(component)
    {
        super();

        this.#component = component;
    }

    get component()
    {
        return this.#component;
    }
}