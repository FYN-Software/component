import { hydrate, processBindings } from '../template.js';
import Directive from './directive.js';
import { setAttributeOnAssert } from '@fyn-software/core/function/dom.js';

declare type IfConf<T extends IBase<T>> = {
    fragments: { [key: string]: IFragment<T> };
};

// TODO(Chris Kruining)
//  This directive should add the binding created
//  from its template to the owner, now values wont
//  get rendered due to this disconnect!
export default class If<T extends IBase<T>> extends Directive<T>
{
    readonly #fragment: IFragment<T>;
    readonly #initialized: Promise<void> = Promise.resolve();

    constructor(node: Element, binding: IBinding<T>, scopes: Array<IScope>, { fragments }: IfConf<T>)
    {
        super(node, binding, scopes);

        this.#fragment = fragments[(node.getRootNode() as ShadowRoot).host?.getAttribute('data-id') ?? '']
            ?? fragments.__root__;
        this.#initialized = this.#initialize();
    }

    async #initialize()
    {
        // await this.#fragment.load();
    }

    public async render()
    {
        const element = this.node as Element;
        element.setAttribute('hidden', '');

        await this.#initialized;

        const value = Boolean(await this.binding.value);

        setAttributeOnAssert(element, value === false, 'hidden');

        if(value)
        {
            element.innerHTML = '';

            const { template, bindings } = await hydrate(this.scopes, this.#fragment.clone());

            element.appendChild(template);

            await processBindings(bindings, this.scopes);
        }
    }
}