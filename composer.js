'use strict';

export default class Composer
{
    static resolve(name, type = 'js')
    {
        const [ ns, ...el ] = name.split('-');
        let prefix;

        switch (ns) {
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
}
