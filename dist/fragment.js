import Composer from './composer.js';
export default class Fragment {
    constructor(template, map) {
        this._template = template;
        this._map = map;
    }
    clone() {
        return new Fragment(this._template.cloneNode(true), new Map(this._map));
    }
    async load() {
        await Promise.all(Array.from(this._template.querySelectorAll(':not(:defined)'))
            .unique()
            .map(n => Composer.load(n.localName)));
    }
    get template() {
        return this._template;
    }
    get map() {
        return this._map;
    }
}
//# sourceMappingURL=fragment.js.map