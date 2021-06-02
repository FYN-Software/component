import Base from './base.js';
export function property(options = {}) {
    return (target, key) => {
        Base.registerProperty(target.constructor, key, options);
    };
}
export function range(min, max) {
    return (target, key) => {
        // console.log(Reflect.getPrototypeOf(target), key);
    };
}
//# sourceMappingURL=decorators.js.map