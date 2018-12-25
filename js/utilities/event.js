'use strict';

export default class Event
{
    static debounce(delay, callback)
    {
        let timeout;

        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                timeout = null;

                callback.apply(this, args);
            }, delay);
        };
    }

    static throttle(delay, callback)
    {
        let timeout = null;

        return function(...args) {
            if(timeout === null)
            {
                callback.apply(this, args);

                timeout = setTimeout(() => {
                    timeout = null;
                }, delay);
            }
        };
    }

    static delay(delay, callback)
    {
        return function(...args) {
            setTimeout(() => callback.apply(this, args), delay);
        };
    }

    static on(el, settings)
    {
        let { options = {}, ...events } = settings;

        options = {
            ...{ capture: false, passive: false },
            ...options
        };

        for(let [event, callback] of Object.entries(events))
        {
            el.addEventListener(
                event,
                e => callback.apply(el, [ e ]),
                options
            );
        }
    }

    static delegate(el, selector, settings)
    {
        for(let e in settings)
        {
            if(e === 'options')
            {
                continue;
            }

            let c = settings[e]

            settings[e] = e => {
                let t = Array.from(el.querySelectorAll(selector)).find(el => e.path.includes(el));

                if(t === undefined)
                {
                    return;
                }

                c.apply(t, [ e ]);
            };
        }

        FYNEvent.on(document.body, settings);
    }

    static trigger(el, name)
    {
        let event = document.createEvent('HTMLEvents');
        event.initEvent(name, false, true);

        el.dispatchEvent(event);
    }
}
