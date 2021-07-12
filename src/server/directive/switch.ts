import Directive from './directive.js';

export default class Switch<T extends IBase<T>> extends Directive<T>
{
    public static async scan(id: string, node: Attr, map: Map<string, any>): Promise<void>
    {
        const mapping = map.get(id);

        // const fragment = new DocumentFragment();
        // fragment.appendChild(node.ownerElement!.querySelector(':scope > [default]') ?? document.createTextNode(''));
        // const defaultCase = await template.scan(fragment, allowedKeys);
        //
        // const cases = new Map();
        // for(const n of node.ownerElement!.querySelectorAll(':scope > [case]'))
        // {
        //     const fragment = new DocumentFragment();
        //     fragment.appendChild(n);
        //
        //     cases.set(n.getAttribute('case'), await template.scan(fragment, allowedKeys));
        // }

        mapping.directive = {
            type: this.type,
            defaultCase: null,
            cases: null,
        };
    }
}