'use strict';

export default class Composer
{
    static resolve(element)
    {
        const parts = element.localName.split('.');

        console.log(element, parts);

        return Promise.resolve(null);
    }
}
