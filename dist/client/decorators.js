import Base from './base.js';
export function property(options = {}) {
    return (target, key) => {
        Base.registerProperty(target.constructor, key, options);
    };
}
export function range(min, max) {
    return (target, key) => {
    };
}
export function component(name, styles) {
    return (target) => {
    };
}
//# sourceMappingURL=decorators.js.map