import Task from './task.js';

const task = Symbol('task');

export default class Stack extends EventTarget
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
        setTimeout(() => this[task].push(...items), 10);
    }

    async dequeue()
    {
        return this[task].pop();
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