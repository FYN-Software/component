'use strict';

export function ease(callback, options = {}) {
    let { duration, easing } = Object.assign({
        duration: 300,
        easing: 'easeInOutCubic',
    }, options);

    let easingFunctions = {
        linear: t => t,
        easeInQuad:     t => easingFunctions.easeIn(t, 2),
        easeOutQuad:    t => easingFunctions.easeOut(t, 2),
        easeInOutQuad:  t => easingFunctions.easeInOut(t, 2),
        easeInCubic:    t => easingFunctions.easeIn(t, 3),
        easeOutCubic:   t => easingFunctions.easeOut(t, 3),
        easeInOutCubic: t => easingFunctions.easeInOut(t, 3),
        easeInQuart:    t => easingFunctions.easeIn(t, 4),
        easeOutQuart:   t => easingFunctions.easeOut(t, 4),
        easeInOutQuart: t => easingFunctions.easeInOut(t, 4),
        easeInQuint:    t => easingFunctions.easeIn(t, 5),
        easeOutQuint:   t => easingFunctions.easeOut(t, 5),
        easeInOutQuint: t => easingFunctions.easeInOut(t, 5),
        easeIn: (t, d = 2) => t**d,
        easeOut: (t, d = 2) => 1 - t**d,
        easeInOut: (t, d = 2) => t**d / (t**d + (1 - t)**d),
    };

    let match = easing.match(/(.+)-(\d+)/);

    switch(true)
    {
        case easingFunctions.hasOwnProperty(easing):
            easing = easingFunctions[easing];
            break;

        case match !== null && easingFunctions.hasOwnProperty(match[1]):
            easing = t => easingFunctions[match[1]](t, match[2]);
    }

    if(typeof easing !== 'function')
    {
        throw new Error('easing is not valid');
    }

    return new Promise((res, rev) => {
        let start;
        let elapsed;

        let animation = (time = 0) => {
            if(!start)
            {
                start = time;
            }

            elapsed = duration === 1
                ? duration
                : time - start;

            try
            {
                callback(easing(elapsed / duration));
            }
            catch(e)
            {
                rev();
            }

            if(elapsed < duration)
            {
                requestAnimationFrame(time => animation(time));
            }
            else
            {
                res();
            }
        };

        animation();
    });
}
