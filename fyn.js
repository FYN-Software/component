import Loop from './loop.js';
import Component from './component.js';
import Collection from './collection.js';
import * as Extends from './extends.js';

import Event from './utilities/event.js';
import Font from './utilities/font.js';
import Css from './utilities/css.js';
import Gunslinger from './utilities/gunslinger.js';
import Cannoneer from './utilities/cannoneer.js';
import * as Animation from './utilities/animation.js';

import * as Glp from '/glp/index.js';

const Utilities = {
    Code: Glp,
    Font,
    Css,
};

export {
    Component,
    Loop,
    Collection,
    Gunslinger,
    Cannoneer,
    Extends,
    Event,
    Utilities,
};
