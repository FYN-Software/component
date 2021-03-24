import Template, {uuidRegex} from '@fyn-software/component/template.js';
import Base from '@fyn-software/component/base.js';
import Directive from '@fyn-software/component/directive/directive.js';

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

        // for(let skip = 0; node.childNodes.length > skip;)
        // {
        //     const c = node.childNodes[skip];
        //
        //     if(c instanceof HTMLSlotElement)
        //     {
        //         skip++;
        //         c.setAttribute('hidden', '');
        //
        //         let ready_cb;
        //         this.#initialized = new Promise(r => ready_cb = r);
        //
        //         c.on({
        //             slotchange: async () => {
        //                 ready_cb();
        //
        //                 await this.#initialized;
        //
        //                 const old = this.#template;
        //                 this.#template = new DocumentFragment();
        //
        //                 for(const el of c.assignedNodes({ flatten: true }))
        //                 {
        //                     this.#template.appendChild(el.cloneNode(true));
        //                 }
        //
        //                 this.#initialized = this.__initialize();
        //
        //                 node.emit('templatechange', {
        //                     old,
        //                     new: this.#template.cloneNode(true),
        //                     directive: this,
        //                 });
        //             },
        //         }).trigger('slotchange');
        //     }
        //     else
        //     {
        //         this.#template.appendChild(c);
        //     }
        // }

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
        const cases = new Map();
        const defaultCase = await Template.scan(
            node.ownerElement.querySelector(':scope > [default]') ?? document.createTextNode(''),
            allowedKeys
        );

        for(const n of node.ownerElement.querySelectorAll(':scope > [case]'))
        {
            n.remove(); // remove from DOM
            cases.set(n.getAttribute('case'), await Template.scan(n, allowedKeys));
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
}