import Templating from '../template.js';
import Directive from './directive.js';

export default class Template<T extends IBase<T>> extends Directive<T>
{
    private readonly _fragment;
    private readonly _initialized;

    constructor(owner: IBase<T>, scope: IScope<T>, node: Node, binding: IBinding<T>, { fragment }: { fragment: IFragment<T> })
    {
        super(owner, scope, node, binding);

        this._fragment = fragment;
        this._initialized = this._initialize();
    }

    private async _initialize(): Promise<void>
    {
        await this._fragment.load();
    }

    async render()
    {
        await this._initialized;

        const [ key, templates ] = await this.binding.value;
        const fragment = templates[key] ?? this._fragment;
        // const fragment = this._templates.get(value) ?? this._fragment;

        (this.node as Element).innerHTML = '';

        const { template, bindings } = await Templating.parseHtml(this.owner, this.scope, fragment, this.owner.properties);

        this.node.appendChild(template);

        await Promise.all(bindings.map(b => b.resolve(this.scope, this.owner)));
        await Promise.all(
            bindings.map(b => b.nodes)
                .reduce((t: Array<Node>, n: Set<Node>) => [ ...t, ...n ], [])
                .unique()
                .map(n => Templating.render(n)));
    }
}