import * as Extends from './extends.js';

import Event from './utilities/event.js';

import Class from './code/class.js';
import Method from './code/method.js';
import Function from './code/function.js';

import Font from './utilities/font.js';

import Type from './data/type.js';
import String from './data/string.js';

const Utilities = {
    Code: {
        Class,
        Method,
        Function,
    },
    Font,
};
const Data = {
    Type,
    String,
};

export {
    Extends,
    Event,
    Utilities,
    Data,
};
