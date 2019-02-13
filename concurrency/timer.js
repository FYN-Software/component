import Task from './task.js';

const task = Symbol('task');

export default class Timer extends EventTarget
{
    constructor(interval, elapsed = null)
    {
        super();

        this[task] = new Task((thread, interval) => {
            setInterval(() => thread.postMessage(null), interval);
        }, interval);

        this[task].on({
            message: () => {
                console.log('YO');

                this.emit('elapsed');
            },
        });

        if(typeof elapsed === 'function')
        {
            this.on({
                elapsed: e => elapsed(e),
            })
        }
    }
}