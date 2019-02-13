import Type from './type.js';

const array = Array;

export default Type.proxyfy(class Array extends Type
{
    set(v)
    {
        if((v instanceof array) === false)
        {
            throw new Error(`Expected an 'Array', got '${v}'`);
        }

        return v;
    }

    [Symbol.iterator]()
    {
        return this[Symbol.toPrimitive]();
    }
});