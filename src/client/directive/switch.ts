import Directive from './directive.js';
import Template from '../template.js';

declare type SwitchConf<T extends IBase<T>> = {
    defaultCase: IFragment<T>,
    cases: Map<string, IFragment<T>>,
};

export default class Switch<T extends IBase<T>> extends Directive<T>
{
    private readonly _defaultCase;
    private readonly _cases;
    private _items = [];
    private readonly _initialized;

    public constructor(node: Node, binding: IBinding<T>, scopes: Array<IScope>, { defaultCase, cases }: SwitchConf<T>)
    {
        super(node, binding, scopes);

        this._defaultCase = defaultCase;
        this._cases = cases;
        this._initialized = this._initialize();
    }

    private async _initialize(): Promise<void>
    {
        this._items = [];

        // await Promise.all(Array.from(this._cases.values()).map(c => c.load()));
    }

    public async render()
    {
        const element = this.node as Element;

        element.setAttribute('hidden', '');

        await this._initialized;

        const current = element.querySelector('[case]');
        if(current !== null)
        {
            current.remove();
        }

        const value = String(await this.binding.value);
        const fragment = this._cases.get(value) ?? this._defaultCase;

        const { template, bindings } = await Template.hydrate<T>(this.scopes, fragment);

        element.appendChild(template);

        await Template.processBindings(bindings, this.scopes);

        element.removeAttribute('hidden');
    }
}