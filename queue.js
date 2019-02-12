const store = Symbol('store');

export default class Queue extends EventTarget
{
    constructor()
    {
        super();

        this[store] = [];
    }

    enqueue(...items)
    {
        this[store].push(...items);
    }

    dequeue()
    {
        return this[store].shift();
    }

    clear()
    {
        this[store] = [];
    }

    toString()
    {
        return this[store].map((i, k) => `${k} :: ${i}`).join('\n');
    }

    *[Symbol.iterator]()
    {
        while(this.length > 0)
        {
            yield this.dequeue();
        }
    }


    get first()
    {
        return this[store].first;
    }

    get last()
    {
        return this[store].last;
    }

    get length()
    {
        return this[store].length;
    }
}