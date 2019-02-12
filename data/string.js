import Type from './type.js';

const oldString = String;

const min = Symbol('min');
const max = Symbol('max');

export default Type.proxyfy(class String extends Type
{
    set(v)
    {
        return oldString(v);
    }

    min(i)
    {
        if(Number.isInteger(i) === false || i < 0)
        {
            throw new Error(`Expected an unsigned integer, got '${i}'`);
        }

        this[min] = i;

        return this;
    }

    max(i)
    {
        if(Number.isInteger(i) === false || i < 0)
        {
            throw new Error(`Expected an unsigned integer, got '${i}'`);
        }

        this[max] = i;

        return this;
    }
});