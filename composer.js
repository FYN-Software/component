const registration = new Map();

export default class Composer
{
    static resolve(name, type = 'js')
    {
        const [ ns, ...el ] = name.split('-');

        if(registration.has(ns) === false)
        {
            throw new Error('Trying to resolve unknown namespace');
        }

        return registration.get(ns).apply(null, [ el, type, ns ]);

        let prefix;

        switch(ns)
        {
            case 'fyn':
                prefix = `http://fyn-software.cpb/suite/${type}`;

                break;

            case 'cpb':
                prefix = `http://a.g.e.cpb/${type}`;

                break;

            default:
                prefix = '';

                break;
        }

        return `${prefix}/${el.join('/')}.${type}`;
    }

    static register(config)
    {
        for(const [ ns, cb] of Object.entries(config))
        {
            registration.set(ns, cb);
        }
    }
}
