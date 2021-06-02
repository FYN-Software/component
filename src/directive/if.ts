import Template from '../template.js';
import Base from '../base.js';
import Directive from './directive.js';

declare type IfConf = {
    fragment: IFragment;
};

// TODO(Chris Kruining)
//  This directive should add the binding created
//  from its template to the owner, now values wont
//  get rendered due to this disconnect!
export default class If<T extends IBase<T>> extends Directive<T>
{
    private readonly _fragment: IFragment;
    private readonly _initialized: Promise<void> = Promise.resolve();

    constructor(owner: IBase<T>, scope: IScope<T>, node: Element, binding: IBinding<T>, { fragment }: IfConf)
    {
        super(owner, scope, node, binding);

        this._fragment = fragment;
        this._initialized = this._initialize();
    }

    private async _initialize()
    {
        await this._fragment.load();
    }

    public async render()
    {
        this.node.setAttribute('hidden', '');

        await this._initialized;
        const value = Boolean(await this.binding.value);

        this.node.attributes.setOnAssert(value === false, 'hidden');

        if(value)
        {
            this.node.innerHTML = '';

            const { template, bindings } = await Base.parseHtml(this.owner, this.scope, this._fragment);

            this.node.appendChild(template);

            await Promise.all(bindings.map(b => b.resolve(this.scope, this.owner)));
            await Promise.all(
                bindings.map(b => b.nodes)
                    .reduce((t: Array<Node>, n: Set<Node>) => [ ...t, ...n ], [])
                    .unique()
                    .map(n => Template.render(n))
            );
        }
    }
}