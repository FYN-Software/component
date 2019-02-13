import Task from './task.js';

const task = Symbol('task');

export default class Queue extends EventTarget
{
    constructor()
    {
        super();

        this[task] = new Task(thread => {
            let store = [];

            const functions = {
                clear()
                {
                    store = [];
                },
                first()
                {
                    return store.first;
                },
                last()
                {
                    return store.last;
                },
                length()
                {
                    return store.length;
                },
            };

            thread.onmessage = e => {
                const [ i, m, a ] = e.data;

                if(functions.hasOwnProperty(m))
                {
                    return thread.postMessage([ i, functions[m](...a) ]);
                }

                return thread.postMessage([ i, store[m](...a) ]);
            };
        });
    }

    async enqueue(...items)
    {
        return this[task].push(...items);
    }

    async dequeue()
    {
        return this[task].shift();
    }

    async clear()
    {
        return this[task].clear();
    }

    async [Symbol.toStringTag]()
    {
        return this[task].map((i, k) => `${k} :: ${i}`).join('\n');
    }

    async *[Symbol.asyncIterator]()
    {
        while(await this.length > 0)
        {
            yield await this.dequeue();
        }
    }

    get first()
    {
        return this[task].first();
    }

    get last()
    {
        return this[task].last();
    }

    get length()
    {
        return this[task].length();
    }
}