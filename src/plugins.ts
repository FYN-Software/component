import LocalizationPlugin from './plugin/localization.js';

export const Localization = new LocalizationPlugin();

// TODO(Chris Kruining) Find a proper implementation of a plugin container...
const plugins: PluginCollection = [
    Localization,
];

const keys = plugins.map(p => p.key);
const values = plugins.map(p => p.plugin);
const entries: Array<[ string, IPlugin ]> = plugins.map(p => [ p.key, p ]);

Object.defineProperties(plugins, {
    keys: {
        value: () => keys,
        configurable: false,
        enumerable: false,
    },
    values: {
        value: () => values,
        configurable: false,
        enumerable: false,
    },
    entries: {
        value: () => entries,
        configurable: false,
        enumerable: false,
    },
});

export default Object.freeze(plugins) as PluginCollection;