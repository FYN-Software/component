import Task from './task.js';

const task = Symbol('task');

export default class Timer extends EventTarget
{
    constructor(interval, elapsed = null)
    {
        super();

        this[task] = new Task((thread, interval) => {
            let i;

            thread.onmessage = e => {
                switch(e.data)
                {
                    case 'start':
                        i = setInterval(() => thread.postMessage(null), interval);
                        break;

                    case 'stop':
                        clearInterval(i);
                        break;
                }
            };
        }, interval);

        this[task].on({
            message: () => {
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

    start()
    {
        this[task].postMessage('start');
    }

    stop()
    {
        this[task].postMessage('stop');
    }
}