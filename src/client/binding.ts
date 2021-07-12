// import plugins from './plugins.js';

const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
const ARGUMENT_NAMES = /([^\s,]+)/g;
function getParamNames(func: AsyncFunction): Array<string>
{
    const functionString = func.toString().replace(STRIP_COMMENTS, '');
    return functionString.slice(functionString.indexOf('(')+1, functionString.indexOf(')')).match(ARGUMENT_NAMES) ?? [];
}

export default class Binding<T extends IBase<T>> implements IBinding<T>
{
    private readonly _tag: string;
    private readonly _keys: Array<string>;
    private readonly _code: string;
    private readonly _nodes: Set<Node> = new Set();
    private _value = Promise.resolve(undefined);
    private readonly _callable: AsyncFunction;

    constructor(tag: string, callable: AsyncFunction)
    {
        this._tag = tag;
        this._keys = getParamNames(callable);
        this._code = callable.toString().replace(STRIP_COMMENTS, '');
        this._callable = callable;
    }

    get tag(): string
    {
        return this._tag;
    }

    get keys(): Array<string>
    {
        return this._keys;
    }

    get code(): string
    {
        return this._code;
    }

    get nodes(): Set<Node>
    {
        return this._nodes;
    }

    get value(): any
    {
        return this._value;
    }

    async resolve(scopes: Array<IScope>): Promise<any>
    {
        console.log(scopes);

        const args = scopes
            .reduce(
                (args: Array<any>, scope: IScope) => args.concat(
                    Object.entries<ViewModelField<T[keyof T]>>(scope.properties)
                        .filter(([ k ]) => this._keys.includes(k))
                        .map(([ , p ]) => p.value)
                ),
                []
            )
            // .concat(plugins.values())

        try
        {
            this._value = this._callable.apply(scopes.first, args);
        }
        catch (e)
        {
            console.error(e);
        }

        return this._value;
    }
}
