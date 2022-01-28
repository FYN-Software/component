export default class Fragment {
    #template;
    #map;
    constructor(template, map) {
        this.#template = template;
        this.#map = map;
    }
    clone() {
        return new Fragment(this.#template.cloneNode(true), new Map(this.#map));
    }
    get template() {
        return this.#template;
    }
    get map() {
        return this.#map;
    }
}
//# sourceMappingURL=fragment.js.map