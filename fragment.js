import Composer from '@fyn-software/component/composer.js';

export default class Fragment
{
    #template;
    #map;

    constructor(template, map)
    {
        this.#template = template;
        this.#map = map;
    }

    clone()
    {
        return new Fragment(
            this.#template.cloneNode(true),
            new Map(this.#map),
        )
    }

    async load()
    {
        await Promise.all(
            Array.from(this.#template.querySelectorAll(':not(:defined)'))
                .unique()
                .map(n => Composer.load(n.localName))
        );
    }

    get template()
    {
        return this.#template;
    }

    get map()
    {
        return this.#map;
    }
}