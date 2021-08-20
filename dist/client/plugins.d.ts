export default class PluginContainer<TPlugins extends {
    [key: string]: IPlugin;
}> {
    private _plugins;
    private _keys;
    private _values;
    private _entries;
    constructor(plugins: TPlugins);
    get(key: string): IPlugin | undefined;
    get keys(): string[];
    get values(): IPlugin[];
    get entries(): [string, IPlugin][];
    static initialize<TPlugins extends {
        [key: string]: IPlugin;
    }>(plugins: TPlugins): IPluginContainer<TPlugins>;
}
//# sourceMappingURL=plugins.d.ts.map