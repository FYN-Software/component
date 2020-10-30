import Template, {uuidRegex} from '../template.js';

const references = new WeakMap;

export default class Directive
{
    static #registry = new Map();

    #owner = null;
    #scope = null;
    #node = null;
    #binding = null;

    static get attribute()
    {
        return this.prototype.constructor.name.toLowerCase();
    }

    constructor(owner, scope, node, binding)
    {
        if(new.target.prototype.hasOwnProperty('render') === false || typeof new.target.prototype.render !== 'function')
        {
            throw new Error(`${new.target.prototype.constructor.name} does not implement method render or is not callable`);
        }

        this.#owner = owner;
        this.#scope = scope;
        this.#node = node;
        this.#binding = binding;
    }

    get owner()
    {
        return this.#owner;
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

        const directive = (await import(this.#registry.get(name))).default ?? null;

        references.set(directive, name);

        return directive;
    }

    static get type()
    {
        return references.get(this);
    }

    static async scan(node, map, allowedKeys = [])
    {
        const template = new DocumentFragment();
        while(node.ownerElement.childNodes.length > 0)
        {
            template.appendChild(node.ownerElement.childNodes[0]);
        }

        const [ , uuid ] = node.nodeValue.match(new RegExp(uuidRegex, ''));
        const mapping = map.get(uuid);
        mapping.directive = {
            type: this.type,
            fragment: await Template.scan(template, allowedKeys),
        };

        return mapping.fragment;
    }
}

Directive.register('if', './if.js');
Directive.register('for', './for.js');
Directive.register('switch', './switch.js');