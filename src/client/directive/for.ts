import lock from '@fyn-software/core/lock.js';
import Directive from './directive.js';
import { hydrate, processBindings } from '../template.js';
import { delay } from '@fyn-software/core/function/promise.js';

declare type ForConf<T extends IBase<T>> = {
    fragments: { [key: string]: IFragment<T> },
    name?: string,
    key?: string,
};

type ForEvents = {
    rendered: void;
    templateChange: IFragment<any>;
};

export default class For<T extends IBase<T> = any> extends Directive<T, ForEvents>
{
    readonly #key;
    readonly #name;
    #fragment: IFragment<T>;
    #items: Array<{ nodes: Array<Node>, bindings: Array<IBinding<T>> }> = [];
    #initialized: Promise<void>;

    public constructor(node: Node, binding: IBinding<T>, scopes: Array<IScope>, { fragments, name = 'it', key = name }: ForConf<T>)
    {
        super(node, binding, scopes);

        // TODO(Chris Kruining)
        //  This is a shotgun solution and will
        //  cause more rendering than needed.
        //  I suspect that expanding the
        //  responsibilities of the bindings might
        //  be the solution.
        for(const scope of scopes as Array<IBase<any>>)
        {
            scope.viewModel.on({ changed: () => this.render() });
        }

        this.#name = name;
        this.#key = key;
        this.#fragment = fragments[(node.getRootNode() as ShadowRoot).host?.getAttribute('data-id') ?? '']
            ?? fragments.__root__;
        this.#initialized = this.#initialize();
    }

    public get fragment(): IFragment<T>
    {
        return this.#fragment;
    }

    public set fragment(fragment: IFragment<T>)
    {
        this.#fragment = fragment;
        this.#initialized = this.#initialize();

        this.emit('templateChange', fragment);

        (this.node as Element).innerHTML = '';

        void this.render();
    }

    async #initialize(): Promise<void>
    {
        this.#items = [];

        // await this.#fragment.load();
    }

    public async render()
    {
        await this.#initialized;

        await lock(this, async () => {
            const value = await this.binding.value;
            let count: number = 0;

            for await (const [ c, k, it ] of valueIterator(value))
            {
                count = c + 1;

                const scope = { properties: { [this.#key]: k, [this.#name]: it } } as IScope;
                const scopes = [ ...this.scopes, scope ];

                if(this.#items.length <= c)
                {
                    const { template, bindings } = await hydrate(scopes, this.#fragment.clone());

                    this.#items.push({ nodes: Array.from<Node>(template.childNodes), bindings });

                    // Wait for all components to be ready
                    if(template instanceof DocumentFragment)
                    {
                        await Promise.all(
                            Array
                                .from(template.querySelectorAll(':defined'))
                                .map(el => (el as any).isReady ?? Promise.resolve(null))
                        );
                    }

                    this.node.appendChild(template);
                }

                await processBindings(this.#items[c].bindings, scopes);
            }

            // Remove "overflow"
            const toRemove = this.#items.splice(count, this.#items.length - count);

            for(const { nodes } of toRemove)
            {
                for(const node of nodes)
                {
                    this.node.removeChild(node);
                }
            }

            //NOTE(Chris Kruining) with a 0 delay in order to allow the browser to actually render the results
            await delay(0);

            this.node.emit('rendered');
        });
    }
}

async function *valueIterator(value: any): AsyncGenerator<[ number, string|number, any ], void, void>
{
    if (typeof value?.[Symbol.asyncIterator] === 'function')
    {
        let i = 0;
        for await(const v of value)
        {
            yield [i, i, v];

            i++;
        }
    }
    else if (typeof value?.[Symbol.iterator] === 'function')
    {
        let i = 0;
        for (const v of value)
        {
            yield [i, i, v];

            i++;
        }
    }
    else
    {
        let i = 0;
        for await(const [k, v] of Object.entries(value ?? {}))
        {
            yield [i, k, v];

            i++;
        }
    }
}