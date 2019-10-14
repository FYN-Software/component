const _component = Symbol('component');

export default class Trigger extends EventTarget
{
    constructor(component)
    {
        super();

        this[_component] = component;
    }

    get component()
    {
        return this[_component];
    }
}