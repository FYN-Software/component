export default class Directive
{
    static #registry = new Map();

    #scope = null;
    #node = null;
    #binding = null;

    static get attribute()
    {
        return this.prototype.constructor.name.toLowerCase();
    }

    constructor(scope, node, binding)
    {
        if(new.target.prototype.hasOwnProperty('render') === false || typeof new.target.prototype.render !== 'function')
        {
            throw new Error(`${new.target.prototype.constructor.name} does not implement method render or is not callable`);
        }

        this.#scope = scope;
        this.#node = node;
        this.#binding = binding;
    }

    get scope()
    {
        return this.#scope;
    }


    get node()
    {
        return this.#node;
    }

    get binding()
    {
        return this.#binding;
    }

    static register(name, path)
    {
        this.#registry.set(name, path);
    }

    static async get(name)
    {
        if(this.#registry.has(name) === false)
        {
            throw new Error(`Directive with name '${name}' is not registered, you can do so by calling "Directive.register('name-of-directive', 'path/to/directive')"`);
        }

        return (await import(this.#registry.get(name))).default;
    }
}

Directive.register('if', './if.js');
Directive.register('for', './for.js');
Directive.register('switch', './switch.js');