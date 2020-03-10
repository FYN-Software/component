export default class Composer
{
    static #registration = new Map();

    static resolve(name, type = 'js')
    {
        const [ vendor, namespace, ...el ] = name.split('-');
        const ns = `${vendor}-${namespace}`;

        if(this.#registration.has(ns) === false)
        {
            throw new Error(`Trying to resolve unknown namespace :: ${ns}`);
        }

        const components = this.#registration.get(ns);

        return `${components.base}/${components[type]}${el.join('/')}.${type}`;
    }

    static async register(...urls)
    {
        return Promise.all(urls.map(async url => {
            const manifest = await fetch(`${url}/manifest.json`).then(r => r.json());

            for(const components of manifest.components)
            {
                components.base = url;

                this.#registration.set(components.namespace, components);
            }
        }));
    }
}
