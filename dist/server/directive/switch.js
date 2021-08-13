import Directive from './directive.js';
export default class Switch extends Directive {
    static async parse(template, binding, node) {
        const result = await super.parse(template, binding, node);
        binding.directive = {
            ...binding.directive,
            defaultCase: null,
            cases: [],
        };
        return result;
    }
}
//# sourceMappingURL=switch.js.map