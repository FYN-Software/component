import * as Types from '../data/types.js';

export default base => class FormAssociated extends base
{
    static formAssociated = true;

    static get properties()
    {
        return {
            tabIndex: Types.Number.default(0),
            type: Types.String,
            label: Types.String,
            name: Types.String,
            value: Types.String,
            error: Types.String,
            inputmode: Types.String,
        };
    }

    #internals;

    constructor(args = {})
    {
        super(args);

        this.#internals = this.attachInternals();

        // this.setValidity({ valueMissing: true }, 'Field may not empty');

        this.observe({
            value: (o, n) => {
                // TODO(Chris Kruining) Do validation

                this.#internals.setFormValue(n);
            },
        });
    }

    setValidity(state, error)
    {
        this.#internals.setValidity(state, error);
        this.error = error;
    }

    get form()
    {
        return this.#internals.form;
    }

    get validity()
    {
        return this.#internals.validity;
    }

    get validationMessage()
    {
        return this.#internals.validationMessage;
    }

    get willValidate()
    {
        return this.#internals.willValidate;
    }

    checkValidity()
    {
        return this.#internals.checkValidity();
    }

    reportValidity()
    {
        return this.#internals.reportValidity();
    }

}