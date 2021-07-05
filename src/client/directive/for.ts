import lock from '@fyn-software/core/lock.js';
import Directive from './directive.js';
import Template from '../template.js';
import Component from '../component.js';

declare type ForConf<T extends IBase<T>> = {
    fragment: IFragment<T>,
    name?: string,
    key?: string,
};

export default class For<T extends IBase<T>> extends Directive<T>
{
    private static _indices = new WeakMap;

    private readonly _key;
    private readonly _name;
    private _fragment: IFragment<T>;
    private _items: Array<{ nodes: Array<Node>, bindings: Array<IBinding<T>> }> = [];
    private _initialized: Promise<void>;

    public constructor(node: Node, binding: IBinding<T>, scopes: Array<IScope>, { fragment, name = 'it', key = name }: ForConf<T>)
    {
        super(node, binding, scopes);

        this._name = name;
        this._key = key;
        this._fragment = fragment;
        this._initialized = this._initialize();
    }

    public get fragment(): IFragment<T>
    {
        return this._fragment;
    }

    public set fragment(fragment: IFragment<T>)
    {
        this._fragment = fragment;
        this._initialized = this._initialize();
        (this.node as Element).innerHTML = '';

        void this.render();
    }

    private async _initialize(): Promise<void>
    {
        this._items = [];

        // await this._fragment.load();
    }

    public async render()
    {
        await this._initialized;

        await lock(this, async () => {
            const value = await this.binding.value;
            let count: number = 0;

            for await (const [ c, k, it ] of valueIterator(value))
            {
                count = c + 1;

                const scope = { properties: { [this._key]: { value: k }, [this._name]: { value: it } } } as IScope;
                const scopes = [ ...this.scopes, scope ];

                if(this._items.length <= c)
                {
                    const { template, bindings } = await Template.hydrate(scopes, this._fragment.clone());

                    this._items.push({ nodes: Array.from<Node>(template.childNodes), bindings });

                    // Wait for all components to be ready
                    if(template instanceof DocumentFragment)
                    {
                        await Promise.all(
                            Array
                                .from(template.querySelectorAll(':defined'))
                                .filter(el => el instanceof Component)
                                .map(el => (el as Component<any>).isReady)
                        );
                    }

                    this.node.appendChild(template);
                }

                const { nodes, bindings } = this._items[c];

                for(const node of nodes)
                {
                    For._indices.set(node, c);
                }

                await Template.processBindings(bindings, scopes);
            }

            // Remove "overflow"
            const toRemove = this._items.splice(count, this._items.length - count);

            for(const { nodes } of toRemove)
            {
                for(const node of nodes)
                {
                    node.remove();
                }
            }

            //NOTE(Chris Kruining) with a 0 delay in order to allow the browser to actually render the results
            await Promise.delay(0);

            this.node.emit('rendered');
        });
    }

    public static get indices()
    {
        return this._indices;
    }
}

async function *valueIterator(value: any): AsyncGenerator<[ number, string|number, any ], void, void>
{
    try
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
    catch (e)
    {
        console.trace(value);
        throw e;
    }
}