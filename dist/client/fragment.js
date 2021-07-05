export default class Fragment {
    _template;
    _map;
    constructor(template, map) {
        this._template = template;
        this._map = map;
    }
    clone() {
        return new Fragment(this._template.cloneNode(true), new Map(this._map));
    }
    get template() {
        return this._template;
    }
    get map() {
        return this._map;
    }
}
//# sourceMappingURL=fragment.js.map