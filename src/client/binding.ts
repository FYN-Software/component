const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
const ARGUMENT_NAMES = /([^\s,]+)/g;
function getParamNames(func: AsyncFunction): Array<string>
{
    const functionString = func.toString().replace(STRIP_COMMENTS, '');
    return functionString.slice(functionString.indexOf('(')+1, functionString.indexOf(')')).match(ARGUMENT_NAMES) ?? [];
}

export default class Binding<T extends IBase<T>> implements IBinding<T>
{
    readonly #tag: string;
    readonly #keys: Array<string>;
    readonly #nodes: Set<Node> = new Set();
    #value = Promise.resolve(undefined);
    readonly #callable: AsyncFunction;

    constructor(tag: string, callable: AsyncFunction)
    {
        this.#tag = tag;
        this.#keys = getParamNames(callable);
        this.#callable = callable;
    }

    get tag(): string
    {
        return this.#tag;
    }

    get keys(): Array<string>
    {
        return this.#keys;
    }

    get nodes(): Set<Node>
    {
        return this.#nodes;
    }

    get value(): any
    {
        return this.#value;
    }

    async resolve(scopes: Array<IScope>, plugins: IPluginContainer): Promise<any>
    {
        const inverseScopes = [ ...scopes].reverse();
        const p = Object.fromEntries(plugins.entries);
        const args = this.#keys.map(key => {
            let val;

            for(const scope of inverseScopes)
            {
                if(scope.properties.hasOwnProperty(key))
                {
                    val = scope.properties[key];
                }
            }

            if(val === undefined && p.hasOwnProperty(key))
            {
                val = p[key];
            }

            return val;
        });

        try
        {
            this.#value = this.#callable.apply(scopes[0], args);
        }
        catch (e)
        {
            console.error(e);
        }

        return this.#value;
    }
}
