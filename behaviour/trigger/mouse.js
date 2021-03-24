import Trigger from '@fyn-software/component/behaviour/trigger/trigger.js';

export default class Mouse extends Trigger
{
    #value = { x: 0, y: 0 };

    constructor(component)
    {
        super(component);

        let active = false;

        component.on({
            mouseenter: e => {
                active = true;

                const rect = component.getBoundingClientRect();
                this.#value = {
                    x: ((e.x - rect.left) / rect.width) * 2 - 1,
                    y: ((e.y - rect.top) / rect.height) * 2 - 1,
                };

                this.emit('start', this.#value);
            },
            mouseleave: () => {
                active = false;

                this.emit('stop', this.#value);
            },
            mousemove: e => {
                if(active === false)
                {
                    return;
                }

                const rect = component.getBoundingClientRect();
                this.#value = {
                    x: ((e.x - rect.left) / rect.width) * 2 - 1,
                    y: ((e.y - rect.top) / rect.height) * 2 - 1,
                };

                this.emit('changed', this.#value);
            },
        });
    }

    get value()
    {
        return this.#value;
    }
}