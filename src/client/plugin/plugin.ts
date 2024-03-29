
export default class Plugin extends EventTarget implements IPlugin
{
    private _bindings: Array<{ binding: IBinding<any>, scopes: Array<IScope> }> = [];

    get bindings(): Array<{ binding: IBinding<any>, scopes: Array<IScope> }>
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
        plugins: IPluginContainer,
        scopes: Array<IScope>,
        binding: IBinding<T>,
        callback: (wrappedArgs: { [p: string]: IPlugin }) => Promise<any>
    ){
        const wrappedArgs = Object.fromEntries(Object.values<IPlugin>(plugins.plugins).map(plugin => {
            const mark = (): any => {
                plugin.bindings.push({ binding, scopes });

                return undefined;
            };

            return [ plugin.key, new Proxy(() => {}, {
                get: mark,
                has: mark,
                deleteProperty: mark,
                apply: mark,
                construct: mark,
            }) as unknown as IPlugin ]
        }));

        try
        {
            await callback(wrappedArgs);
        }
        catch (e)
        {
            console.error(e);
        }
    }
}