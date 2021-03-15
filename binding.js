import Type from '@fyn-software/data/type/type.js';
import plugins from '@fyn-software/component/plugins.js';

export default class Binding
{
    #tag;
    #original;
    #expression;
    #keys;
    #nodes = new Set();
    #value = Promise.resolve(undefined);
    #callable;

    constructor(tag, original, expression, keys, callable)
    {
        this.#tag = tag;
        this.#original = original;
        this.#expression = expression;
        this.#keys = keys;
        this.#callable = callable;
    }

    get tag()
    {
        return this.#tag;
    }

    get expression()
    {
        return this.#expression;
    }

    get original()
    {
        return this.#original;
    }

    get value()
    {
        return this.#value;
    }

    get nodes()
    {
        return this.#nodes;
    }

    get keys()
    {
        return this.#keys;
    }

    async resolve(scope, self)
    {
        const args = [
            ...Object.entries(scope.properties)
                .filter(([ k ]) => this.#keys.includes(k))
                .map(([ , p ]) => p instanceof Type ? p.$.value : p),
            ...plugins.values()
        ];

        try
        {
            this.#value = this.#callable.apply(self ?? scope, args);
        }
        catch (e) {
            console.error(e);
        }

        return this.#value;
    }
}