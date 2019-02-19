import * as Extends from '../core/extends.js';

import Event from '../core/event.js';

import Class from './code/class.js';
import Method from './code/method.js';
import Function from './code/function.js';

import Font from './utilities/font.js';

import Type from '../data/type/type.js';
import String from '../data/type/string.js';
import Boolean from '../data/type/boolean.js';
import Array from '../data/type/array.js';

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
    Boolean,
    Array,
};

export {
    Extends,
    Event,
    Utilities,
    Data,
};
