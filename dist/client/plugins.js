export default class PluginContainer {
    _plugins;
    _keys;
    _values;
    _entries;
    constructor(plugins) {
        this._plugins = plugins;
        this._keys = Object.values(plugins).map(p => p.key);
        this._values = Object.values(plugins).map(p => p.plugin);
        this._entries = Object.values(plugins).map(p => [p.key, p]);
    }
    get(key) {
        return this._values.find(p => p.key === key);
    }
    get keys() {
        return this._keys;
    }
    get values() {
        return this._values;
    }
    get entries() {
        return this._entries;
    }
    static initialize(plugins) {
        const container = new PluginContainer(plugins);
        return new Proxy({}, {
            get: (c, p) => container._plugins[p] ?? container[p],
        });
    }
}
//# sourceMappingURL=plugins.js.map