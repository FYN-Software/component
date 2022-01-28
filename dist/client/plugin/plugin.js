export default class Plugin extends EventTarget {
    _bindings = [];
    get bindings() {
        return this._bindings;
    }
    get key() {
        return this.constructor.name;
    }
    get plugin() {
        return this;
    }
    static async discover(plugins, scopes, binding, callback) {
        const wrappedArgs = Object.fromEntries(Object.values(plugins.plugins).map(plugin => {
            const mark = () => {
                plugin.bindings.push({ binding, scopes });
                return undefined;
            };
            return [plugin.key, new Proxy(() => { }, {
                    get: mark,
                    has: mark,
                    deleteProperty: mark,
                    apply: mark,
                    construct: mark,
                })];
        }));
        try {
            await callback(wrappedArgs);
        }
        catch (e) {
            console.error(e);
        }
    }
}
//# sourceMappingURL=plugin.js.map