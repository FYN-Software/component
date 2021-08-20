export default class PluginContainer<TPlugins extends { [key: string]: IPlugin }>
{
    private _plugins: TPlugins;
    private _keys: Array<string>;
    private _values: Array<IPlugin>;
    private _entries: Array<[ string, IPlugin ]>;

    public constructor(plugins: TPlugins)
    {
        this._plugins = plugins
        this._keys = Object.values(plugins).map(p => p.key);
        this._values = Object.values(plugins).map(p => p.plugin);
        this._entries = Object.values(plugins).map(p => [ p.key, p ]);
    }

    get(key: string): IPlugin|undefined
    {
        return this._values.find(p => p.key === key);
    }

    get keys()
    {
        return this._keys;
    }

    get values()
    {
        return this._values;
    }

    get entries()
    {
        return this._entries;
    }

    public static initialize<TPlugins extends { [key: string]: IPlugin }>(plugins: TPlugins): IPluginContainer<TPlugins>
    {
        const container = new PluginContainer<TPlugins>(plugins);

        return new Proxy({}, {
            get: (c: {}, p: string) => container._plugins[p] ?? container[p as keyof PluginContainer<TPlugins>],
        }) as IPluginContainer<TPlugins>;
    }
}