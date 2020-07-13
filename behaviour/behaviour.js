const _trigger = Symbol('trigger');

export default class Behaviour extends EventTarget
{
    #trigger;

    constructor(trigger)
    {
        super();

        this.#trigger = trigger;

        trigger.on({
            start: d => this.emit('start', { new: d }),
            stop: d => this.emit('stop', { new: d }),
            changed: d => this.emit('changed', { new: d }),
        })
    }

    get trigger()
    {
        return this.#trigger;
    }
}