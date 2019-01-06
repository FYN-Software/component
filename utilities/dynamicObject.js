class DynamicObject
{
    constructor()
    {
        return new Proxy({}, {
            get: (c, p) => {
                return this.hasOwnProperty(p)
                    ? this[p]
                    : this.__get(p);
            },
            set: (c, p, v) => {
                this.__set(p, v);

                return true;
            },
        });
    }

    static __get(property)
    {
        return undefined;
    }

    static __set(property)
    {
        return undefined;
    }

    __get(property)
    {
        return undefined;
    }

    __set(property)
    {
        return undefined;
    }
}

DynamicObject = new Proxy(DynamicObject, {
    get: (c, p, r) => {
        return c.hasOwnProperty(p)
            ? c[p]
            : r.__get(p);
    },
    set: (c, p, v, r) => {

        if(c.hasOwnProperty(p))
        {
            c[p] = v;
        }
        else
        {
            r.__set(p, v);
        }

        return true;
    },
});

export default DynamicObject;
