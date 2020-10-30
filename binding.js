import Type from '../data/type/type.js';

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

    set callable(callable)
    {
        if((callable instanceof AsyncFunction) === false)
        {
            throw new Error(
                `Expected an instance of '${ AsyncFunction.name }', got '${callable.constructor.name}' instead`
            );
        }

        this.#callable = callable;
    }

    async resolve(scope, self)
    {
        try
        {
            this.#value = this.#callable.apply(
                self ?? scope,
                Object.entries(scope.properties)
                    .filter(([ k ]) => this.#keys.includes(k))
                    .map(([ , p ]) => p instanceof Type ? p.$.value : p)
            );
        }
        catch (e) {
            console.error(e);
        }

        return this.#value;
    }
}