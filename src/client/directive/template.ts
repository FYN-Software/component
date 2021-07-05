import Templating from '../template.js';
import Directive from './directive.js';

export default class Template<T extends IBase<T>> extends Directive<T>
{
    private readonly _fragment;
    private readonly _initialized;

    constructor(node: Node, binding: IBinding<T>, scopes: Array<IScope>, { fragment }: { fragment: IFragment<T> })
    {
        super(node, binding, scopes);

        this._fragment = fragment;
        this._initialized = this._initialize();
    }

    private async _initialize(): Promise<void>
    {
        // await this._fragment.load();
    }

    async render()
    {
        await this._initialized;

        const [ key, templates ] = await this.binding.value;

        const fragment = templates[key] ?? this._fragment;

        (this.node as Element).innerHTML = '';

        const { template, bindings } = await Templating.hydrate(this.scopes, fragment.clone());

        this.node.appendChild(template);

        await Templating.processBindings(bindings, this.scopes);
    }
}