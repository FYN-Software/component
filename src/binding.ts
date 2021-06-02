import Type from '@fyn-software/data/type/type.js';
import plugins from './plugins.js';

export default class Binding<T extends IBase<T>> implements IBinding<T>
{
    private readonly _tag: string;
    private readonly _original: string;
    private readonly _expression: string;
    private readonly _keys: Array<keyof T>;
    private readonly _nodes: Set<Node> = new Set();
    private _value = Promise.resolve(undefined);
    private readonly _callable: AsyncFunction;

    constructor(tag: string, original: string, expression: string, keys: Array<keyof T>, callable: AsyncFunction)
    {
        this._tag = tag;
        this._original = original;
        this._expression = expression;
        this._keys = keys;
        this._callable = callable;
    }

    get tag(): string
    {
        return this._tag;
    }

    get expression(): string
    {
        return this._expression;
    }

    get original(): string
    {
        return this._original;
    }

    get keys(): Array<keyof T>
    {
        return this._keys;
    }

    get nodes(): Set<Node>
    {
        return this._nodes;
    }

    get value(): any
    {
        return this._value;
    }

    async resolve(scope: IScope<T>, self: IScope<T>): Promise<any>
    {
        const args = [
            ...Object.entries<ViewModelField<T[keyof T]>>(scope.properties)
                .filter(([ k ]) => this._keys.includes(k as keyof T))
                .map(([ , p ]) => p.value),
            ...plugins.values(),
        ];

        try
        {
            this._value = this._callable.apply(self ?? scope, args);
        }
        catch (e)
        {
            console.error(e);
        }

        return this._value;
    }
}
