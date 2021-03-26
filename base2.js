var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _viewModel, _observers;
export default class Base {
    constructor() {
        _viewModel.set(this, void 0);
        _observers.set(this, void 0);
    }
    observe(config) {
        for (const [p, c] of Object.entries(config)) {
            if (Object.keys(__classPrivateFieldGet(this, _viewModel)).includes(p) !== true) {
                throw new Error(`Trying to observe non-observable property '${p}'`);
            }
            if (__classPrivateFieldGet(this, _observers).has(p) === false) {
                __classPrivateFieldGet(this, _observers).set(p, []);
            }
            __classPrivateFieldGet(this, _observers).get(p).push(c);
        }
        return this;
    }
}
_viewModel = new WeakMap(), _observers = new WeakMap();
//# sourceMappingURL=base2.js.map