import LocalizationPlugin from './plugin/localization.js';
export const Localization = new LocalizationPlugin();
// TODO(Chris Kruining) Find a proper implementation of a plugin container...
const plugins = [
    Localization,
];
const keys = plugins.map(p => p.key);
const values = plugins.map(p => p.plugin);
const entries = plugins.map(p => [p.key, p]);
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
export default Object.freeze(plugins);
//# sourceMappingURL=plugins.js.map