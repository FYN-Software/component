export default class Directive extends EventTarget {
    #node;
    #binding;
    #scopes;
    events;
    get scopes() {
        return this.#scopes;
    }
    get node() {
        return this.#node;
    }
    get binding() {
        return this.#binding;
    }
    constructor(node, binding, scopes) {
        super();
        this.#node = node;
        this.#binding = binding;
        this.#scopes = scopes;
    }
    transferTo(node) {
        this.#node = node;
    }
}
//# sourceMappingURL=directive.js.map