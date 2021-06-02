
export default class Plugin extends EventTarget implements IPlugin
{
    private _bindings = [];

    get bindings(): Array<any>
    {
        return this._bindings;
    }

    get key(): string
    {
        return this.constructor.name;
    }

    get plugin(): IPlugin
    {
        return this;
    }

    public static async discover<T extends IBase<T>>(
        plugins: Array<IPlugin>,
        scope: IScope<T>,
        binding: IBinding<T>,
        callback: (...wrappedArgs: Array<any>) => Promise<any>
    ){
        const wrappedArgs = plugins.map(plugin => {
            const mark = (): any => {
                plugin.bindings.push({ binding, scope });

                return undefined;
            };

            return new Proxy(() => {}, {
                get: mark,
                has: mark,
                deleteProperty: mark,
                apply: mark,
                construct: mark,
            })
        });

        try
        {
            await callback(...wrappedArgs);
        }
        catch (e)
        {
            console.error(e);
        }
    }
}