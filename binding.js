import Type from '../data/type/type.js';

export const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

export default class Binding
{
    #original;
    #expression;
    #label;
    #keys;
    #nodes = new Set();
    #value = Promise.resolve(undefined);
    #callable;

    constructor(original, expression, label, keys, callable)
    {
        this.#original = original;
        this.#expression = expression;
        this.#label = label;
        this.#keys = keys;
        this.#callable = callable;
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
                `Exprected an instance of '${ AsyncFunction.name }', got '${callable.constructor.name}' instead`
            );
        }

        this.#callable = callable;
    }

    async resolve(scope)
    {
        let t = scope;

        try
        {
            while(t.properties && t.properties.hasOwnProperty('__this__') === true)
            {
                t = t.properties.__this__;
            }
        }
        catch
        {
            t = scope;
        }

        try
        {
            this.#value = this.#callable.apply(
                t,
                Object.entries(scope.properties)
                    .filter(([ k ]) => this.#keys.includes(k))
                    .map(([ , p ]) => p instanceof Type ? p.__value : p)
            );
        }
        catch (e) {}

        return this.#value;
    }
}