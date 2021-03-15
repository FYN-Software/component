import * as Types from '@fyn-software/data/types.js';
import Component from '@fyn-software/component/component.js';

export default class FormAssociated extends Component
{
    static get extends()
    {
        return class extends HTMLElement
        {
            static formAssociated = true;
        };
    }

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

    constructor(parent, args = {})
    {
        super(parent, args);

        // this.setValidity({ valueMissing: true }, 'Field may not empty');

        this.observe({
            value: (o, n) => {
                // TODO(Chris Kruining) Do validation

                // TODO(Chris Kruining) This plain String cast is obviously wrong...
                this.internals.setFormValue(String(n));
            },
        });
    }

    setValidity(state, error)
    {
        this.internals.setValidity(state, error);
        this.error = error;
    }

    get form()
    {
        return this.internals.form;
    }

    get validity()
    {
        return this.internals.validity;
    }

    get validationMessage()
    {
        return this.internals.validationMessage;
    }

    get willValidate()
    {
        return this.internals.willValidate;
    }

    checkValidity()
    {
        return this.internals.checkValidity();
    }

    reportValidity()
    {
        return this.internals.reportValidity();
    }

}