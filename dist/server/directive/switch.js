import Directive from './directive.js';
export default class Switch extends Directive {
    static async scan(id, node, map) {
        const mapping = map.get(id);
        mapping.directive = {
            type: this.type,
            defaultCase: null,
            cases: null,
        };
    }
}
//# sourceMappingURL=switch.js.map