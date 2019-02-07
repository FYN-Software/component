import Loop from './loop.js';
import Component from './component.js';
import Composer from './composer.js';
import * as Extends from './extends.js';

import Event from './utilities/event.js';
import Font from './utilities/font.js';

import Class from './code/class.js';
import Method from './code/method.js';
import Function from './code/function.js';

const Utilities = {
    Code: {
        Class,
        Method,
        Function,
    },
    Font,
};

export {
    Component,
    Composer,
    Extends,
    Event,
    Utilities,
};
