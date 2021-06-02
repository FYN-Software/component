var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import Component from './component.js';
import { property } from './decorators.js';
export default class FormAssociated extends Component {
    constructor(args = {}) {
        super(args);
        this.required = false;
        this.tabIndex = 0;
        this.type = '';
        this.label = '';
        this.name = '';
        this.value = '';
        this.error = '';
        this.inputMode = '';
        // this.setValidity({ valueMissing: true }, 'Field may not empty');
    }
    async init() {
        await super.init();
        this.observe({
            value: (o, n) => {
                // TODO(Chris Kruining) Do validation
                // TODO(Chris Kruining) This plain String cast is obviously wrong...
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
FormAssociated.formAssociated = true;
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