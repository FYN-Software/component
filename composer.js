'use strict';

export default class Composer
{
    static resolve(name)
    {
        const [ vendor = '', packet = '', path = '' ] = name.split('.');

        return `http://${vendor}.cpb/${packet}/js/${path.replace(/-/g, '/')}.js`;
    }
}
