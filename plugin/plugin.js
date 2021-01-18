export default class Plugin
{
    #bindings = [];

    get bindings()
    {
        return this.#bindings;
    }

    get key()
    {
        return this.constructor.name;
    }

    get plugin()
    {
        return this;
    }

    static async discover(plugins, scope, binding, callback)
    {
        const mark = plugin => {
            console.log(plugin);

            plugin.bindings.push({ binding, scope });
        }
        const handler = {
            get: (t, p) => {
                console.log(t);

                mark(t);
            },
            has: mark,
            deleteProperty: mark,
            apply: mark,
            construct: mark,
        };

        await callback(...plugins.map(plugin => {
            const mark = () => plugin.bindings.push({ binding, scope });
            return new Proxy(() => {}, {
                get: mark,
                has: mark,
                deleteProperty: mark,
                apply: mark,
                construct: mark,
            })
        }));
    }
}