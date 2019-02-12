const value = Symbol('value');

export default class Type extends EventTarget
{
    constructor(v = null)
    {
        super();

        this[value] = this.set(v);

        let lastP;
        const proxy = new Proxy(() => {}, {
            get: (c, p) => {
                const getter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this), p).get;

                if(getter !== undefined)
                {
                    return this[p];
                }

                lastP = p;

                return proxy;
            },
            set: (c, p, v) => {
                this[value] = this.set(v);

                return true;
            },
            apply: (c, s, a) => {
                const res = this[lastP](...a);

                return res === this
                    ? proxy
                    : res;
            },
        });

        return proxy;
    }

    [Symbol.toPrimitive]()
    {
        return this[value];
    }

    [Symbol.toStringTag]()
    {
        return this.constructor.name;
    }

    set(v)
    {
        return v;
    }

    static proxyfy(def)
    {
        return new Proxy(def, {
            get: (c, p) => c[p],
            set: (c, p, v) => this[value] = v,
            apply: (c, s, a) => new c(...a),
        });
    }
}