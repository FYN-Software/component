import Trigger from '@fyn-software/component/behaviour/trigger/trigger.js';
import Event from '@fyn-software/core/event.js';

export default class Scroll extends Trigger
{
    #value = { x: 0, y: 0 };

    constructor(container, component)
    {
        super(component);

        const start = Event.debounce(10, () => this.emit('start'));
        const stop = Event.throttle(10, () => this.emit('stop'));

        container.on({
            scroll: e => {
                start();

                const elRect = component.getBoundingClientRect();
                const conRect = container.getBoundingClientRect();

                this.#value = {
                    x: elRect.left / (conRect.width - elRect.width),
                    y: elRect.top / (conRect.height - elRect.height),
                };

                this.emit('changed', this.#value);

                stop();
            },
        });
    }

    get value()
    {
        return this.#value;
    }
}