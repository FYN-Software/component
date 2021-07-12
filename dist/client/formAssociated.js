import { __decorate } from "tslib";
import Component from './component.js';
import { property } from './decorators.js';
export default class FormAssociated extends Component {
    static formAssociated = true;
    required = false;
    tabIndex = 0;
    type = '';
    label = '';
    name = '';
    value = '';
    error = '';
    inputMode = '';
    constructor(args = {}) {
        super(args);
    }
    async init() {
        await super.init();
        this.observe({
            value: (o, n) => {
                this.internals.setFormValue(String(n));
            },
        });
    }
    setValidity(state, error) {
        this.internals.setValidity(state, error);
        this.error = error;
    }
    get form() {
        return this.internals.form;
    }
    get validity() {
        return this.internals.validity;
    }
    get validationMessage() {
        return this.internals.validationMessage;
    }
    get willValidate() {
        return this.internals.willValidate;
    }
    checkValidity() {
        return this.internals.checkValidity();
    }
    reportValidity() {
        return this.internals.reportValidity();
    }
}
__decorate([
    property()
], FormAssociated.prototype, "required", void 0);
__decorate([
    property()
], FormAssociated.prototype, "tabIndex", void 0);
__decorate([
    property()
], FormAssociated.prototype, "type", void 0);
__decorate([
    property()
], FormAssociated.prototype, "label", void 0);
__decorate([
    property()
], FormAssociated.prototype, "name", void 0);
__decorate([
    property()
], FormAssociated.prototype, "value", void 0);
__decorate([
    property()
], FormAssociated.prototype, "error", void 0);
__decorate([
    property()
], FormAssociated.prototype, "inputMode", void 0);
//# sourceMappingURL=formAssociated.js.map