export function initialize(plugins) {
    const container = {
        keys: Object.values(plugins).map(p => p.key),
        values: Object.values(plugins).map(p => p.plugin),
        entries: Object.values(plugins).map(p => [p.key, p.plugin]),
        plugins,
    };
    return new Proxy({}, {
        get: (c, p) => plugins[p] ?? container[p],
    });
}
//# sourceMappingURL=plugins.js.map