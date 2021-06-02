import Template, {uuidRegex} from '@fyn-software/component/template.js';
import Base from '@fyn-software/component/base.js';
import Directive from '@fyn-software/component/directive/directive.js';
import Fragment from '../fragment.js';

// TODO(Chris Kruining)
//  This directive should add the binding created
//  from its template to the owner, now values wont
//  get rendered due to this disconnect!
export default class Switch extends Directive
{
    #defaultCase;
    #cases;
    #items = [];
    #initialized = Promise.resolve(null);

    constructor(owner, scope, node, binding, { defaultCase, cases })
    {
        super(owner, scope, node, binding);

        this.#defaultCase = defaultCase;
        this.#cases = cases;
        this.#initialized = this.__initialize();
    }

    async __initialize()
    {
        this.#items = [];

        await Promise.all(Array.from(this.#cases.values()).map(c => c.load()));
    }

    async render()
    {
        this.node.setAttribute('hidden', '');

        await this.#initialized;

        const current = this.node.querySelector('[case]');
        if(current !== null)
        {
            current.remove();
        }

        const value = String(await this.binding.value);
        const fragment = this.#cases.get(value) ?? this.#defaultCase;

        const { template, bindings } = await Base.parseHtml(this.owner, this.scope, fragment);

        this.node.appendChild(template);

        await Promise.all(bindings.map(b => b.resolve(this.scope, this.owner)));
        await Promise.all(bindings.map(b => b.nodes).reduce((t, n) => [ ...t, ...n ], []).unique().map(n => Template.render(n)));

        this.node.removeAttribute('hidden');
    }

    static async scan(node, map, allowedKeys = [])
    {
        const [ , uuid ] = node.nodeValue.match(new RegExp(uuidRegex, ''));
        const mapping = map.get(uuid);

        const fragment = new DocumentFragment();
        fragment.appendChild(node.ownerElement.querySelector(':scope > [default]') ?? document.createTextNode(''));
        const defaultCase = await Template.cache(fragment, allowedKeys);

        const cases = new Map();
        for(const n of node.ownerElement.querySelectorAll(':scope > [case]'))
        {
            const fragment = new DocumentFragment();
            fragment.appendChild(n);

            cases.set(n.getAttribute('case'), await Template.cache(fragment, allowedKeys));
        }

        mapping.directive = {
            type: this.type,
            defaultCase,
            cases,
        };

        // NOTE(Chris Kruining)
        // I don't have a single fragment here
        // like with other directives. so I
        // return none for now, this is an issue
        // I will solve when the need arises
        return null;
    }

    static async deserialize(mapping)
    {
        const cases = new Map();

        for(const [ k, c ] of mapping.cases.entries())
        {
            const { html, map } = await Template.deserialize(c);

            cases.set(k, new Fragment(html, map))
        }

        const { html, map } = await Template.deserialize(mapping.defaultCase);

        mapping.defaultCase = new Fragment(html, map);
        mapping.cases = cases;
    }
}