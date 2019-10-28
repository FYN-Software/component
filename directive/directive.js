const _node = Symbol('node');
const _binding = Symbol('binding');

export default class Directive
{
    static get attribute()
    {
        return this.prototype.constructor.name.toLowerCase();
    }

    constructor(node, binding)
    {
        if(new.target.prototype.hasOwnProperty('render') === false || typeof new.target.prototype.render !== 'function')
        {
            throw new Error(`${new.target.prototype.constructor.name} does not implement method render or is not callable`);
        }

        Object.defineProperty(node, '__directive__', {
            get: () => this
        });

        this[_node] = node;
        this[_binding] = binding;
    }

    get node()
    {
        return this[_node];
    }

    get binding()
    {
        return this[_binding];
    }
}