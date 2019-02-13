export default class Event
{
    static debounce(delay, callback)
    {
        let timeout;

        return function(...args)
        {
            clearTimeout(timeout);
            timeout = setTimeout(() =>
            {
                timeout = null;

                callback.apply(this, args);
            }, delay);
        };
    }

    static throttle(delay, callback)
    {
        let timeout = null;

        return function(...args)
        {
            if(timeout === null)
            {
                callback.apply(this, args);

                timeout = setTimeout(() =>
                {
                    timeout = null;
                }, delay);
            }
        };
    }

    static delay(delay, callback)
    {
        return function(...args)
        {
            setTimeout(() => callback.apply(this, args), delay);
        };
    }

    static on(target, settings)
    {
        let { options = {}, ...events } = settings;

        options = {
            ...{ capture: false, passive: false },
            ...options,
        };

        for(let [ event, callback ] of Object.entries(events))
        {
            target.addEventListener(
                event,
                callback.bind(target),
                options
            );
        }
    }

    static delegate(target, selector, settings)
    {
        for(let [ e, c ] of Object.entries(settings))
        {
            if(e === 'options')
            {
                continue;
            }

            settings[e] = e =>
            {
                let t = Array.from(target.querySelectorAll(selector)).find(el => e.path.includes(el));

                if(t === undefined)
                {
                    return;
                }

                c.apply(t, [ e ]);
            };
        }

        Event.on(document.body, settings);
    }

    static trigger(target, name)
    {
        let event = document.createEvent('HTMLEvents');
        event.initEvent(name, false, true);

        target.dispatchEvent(event);
    }
}
