const _trigger = Symbol('trigger');

export default class Behavior extends EventTarget
{
    #trigger;

    constructor(trigger)
    {
        super();

        this.#trigger = trigger;

        trigger.on({
            options: { details: true },
            start: d => this.emit('start', d),
            stop: d => this.emit('stop', d),
            changed: d => this.emit('changed', d),
        })
    }

    get trigger()
    {
        return this.#trigger;
    }
}