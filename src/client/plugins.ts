export function initialize<TPlugins extends { [key: string]: IPlugin }>(plugins: TPlugins): IPluginContainer<TPlugins>
{
    const container = {
        keys: Object.values(plugins).map(p => p.key),
        values: Object.values(plugins).map(p => p.plugin),
        entries: Object.values(plugins).map(p => [ p.key, p.plugin ]),
        plugins,
    };

    return new Proxy({}, {
        get: (c: {}, p: string) => plugins[p] ?? container[p as 'keys'|'values'|'entries'|'plugins'],
    }) as IPluginContainer<TPlugins>;
}