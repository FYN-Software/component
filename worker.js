import * as Extends from './extends.js';
import { Data } from './fyn-lite.js';

self.on({
    message: e => {
        // console.log(e);
        console.log(e.data, Data);

        e.target.postMessage('pong');
    },
});