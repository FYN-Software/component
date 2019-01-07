class DynamicObject
{
    constructor()
    {
        return new Proxy({}, {
            get: (c, p) =>
                this.hasOwnProperty(p)
                    ? this[p]
                    : this.__get(p),
            set: (c, p, v) =>
            {
                this.__set(p, v);

                return true;
            },
        });
    }

    static __get()
    {
        return undefined;
    }

    static __set()
    {
        return undefined;
    }

    __get()
    {
        return undefined;
    }

    __set()
    {
        return undefined;
    }
}

// eslint-disable-next-line no-class-assign
DynamicObject = new Proxy(DynamicObject, {
    get: (c, p, r) =>
        c.hasOwnProperty(p)
            ? c[p]
            : r.__get(p),
    set: (c, p, v, r) =>
    {
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
