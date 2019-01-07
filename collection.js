export default class Collection
{
    constructor()
    {
        this.lower = 0;
        this.upper = 1000;
        this.increment = 1;
        this.name = '';
        this.index = null;
        this.group = null;
        this._items;
    }

    static from(items)
    {
        return new this().in(items);
    }

    target(...names)
    {
        if(names.length === 1)
        {
            this.name = names[0];
        }
        else if(names.length === 2)
        {
            this.index = names[0];
            this.name = names[1];
        }

        return this;
    }

    in(items)
    {
        if(Number.isInteger(items))
        {
            this.lower = items;
        }
        else if(items === undefined || items === null)
        {
            this._items = [];
        }
        else if(Array.isArray(items) && items.length === 2 && items.every(i => Number.isInteger(i)))
        {
            this.lower = items[0];
            this.upper = items[1];
        }
        else if(!Array.isArray(items) && items.__isProxy)
        {
            this._items = [];
        }
        else if(typeof items === 'string')
        {
            this._items = [];
        }
        else
        {
            this._items = items;
        }

        return this;
    }

    to(to)
    {
        this.upper = Math.min(this.upper, to);

        return this;
    }

    limit(upper, lower = null)
    {
        this.upper = Math.min(this.upper, upper);

        if(lower !== null)
        {
            this.lower = Math.max(this.lower, lower);
        }

        return this;
    }

    step(amount)
    {
        this.increment = amount;

        return this;
    }

    where()
    {
        return this;
    }

    groupBy(key)
    {
        this.group = key;

        return this;
    }

    get(i)
    {
        return this._items[i];
    }

    get length()
    {
        return Array.isArray(this._items)
            ? this._items.length
            : this.upper * this.increment - this.lower;
    }

    set items(v)
    {
        return this.in(v);
    }

    toArray()
    {
        return Array.from(this, i => i[1]);
    }

    *[Symbol.iterator]()
    {
        let items = this._items;

        if(this.group !== null && Array.isArray(items))
        {
            items = Object.values(items.reduce((t, i) =>
{
                let key = i[this.group];
                t[key instanceof NodeList ? undefined : key] = i;

                return t;
            }, {}));
        }

        let upper = this.upper * this.increment,

         c = 0;

        for(let i = this.lower; i < (Array.isArray(items) ? items.length : upper) && i < upper; i += this.increment)
        {
            yield [ i, Array.isArray(items) ? items[i] : i, c ];

            c++;
        }
    }
}
