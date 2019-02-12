import Type from './type.js';

const bool = Boolean;

export default Type.proxyfy(class Boolean extends Type
{
    set(v)
    {
        return bool(v);
    }
});