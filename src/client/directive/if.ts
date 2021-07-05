import Template from '../template.js';
import Directive from './directive.js';

declare type IfConf<T extends IBase<T>> = {
    fragment: IFragment<T>;
};

// TODO(Chris Kruining)
//  This directive should add the binding created
//  from its template to the owner, now values wont
//  get rendered due to this disconnect!
export default class If<T extends IBase<T>> extends Directive<T>
{
    private readonly _fragment: IFragment<T>;
    private readonly _initialized: Promise<void> = Promise.resolve();

    constructor(node: Element, binding: IBinding<T>, scopes: Array<IScope>, { fragment }: IfConf<T>)
    {
        super(node, binding, scopes);

        this._fragment = fragment;
        this._initialized = this._initialize();
    }

    private async _initialize()
    {
        // await this._fragment.load();
    }

    public async render()
    {
        const element = this.node as Element;
        element.setAttribute('hidden', '');

        await this._initialized;

        const value = Boolean(await this.binding.value);

        element.attributes.setOnAssert(value === false, 'hidden');

        if(value)
        {
            element.innerHTML = '';

            const { template, bindings } = await Template.hydrate(this.scopes, this._fragment.clone());

            element.appendChild(template);

            await Template.processBindings(bindings, this.scopes);
        }
    }
}