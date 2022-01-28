import Directive from './directive.js';
import { hydrate, processBindings } from '../template.js';

declare type SwitchConf<T extends IBase<T>> = {
    defaultCase: IFragment<T>,
    cases: Map<string, IFragment<T>>,
};

export default class Switch<T extends IBase<T>> extends Directive<T>
{
    readonly #defaultCase;
    readonly #cases;
    #items = [];
    readonly #initialized;

    public constructor(node: Node, binding: IBinding<T>, scopes: Array<IScope>, { defaultCase, cases }: SwitchConf<T>)
    {
        super(node, binding, scopes);

        this.#defaultCase = defaultCase;
        this.#cases = cases;
        this.#initialized = this.#initialize();
    }

    async #initialize(): Promise<void>
    {
        this.#items = [];

        // await Promise.all(Array.from(this.#cases.values()).map(c => c.load()));
    }

    public async render()
    {
        const element = this.node as Element;

        element.setAttribute('hidden', '');

        await this.#initialized;

        const current = element.querySelector('[case]');
        if(current !== null)
        {
            current.remove();
        }

        const value = String(await this.binding.value);
        const fragment = this.#cases.get(value) ?? this.#defaultCase;

        const { template, bindings } = await hydrate<T>(this.scopes, fragment);

        element.appendChild(template);

        await processBindings(bindings, this.scopes);

        element.removeAttribute('hidden');
    }
}