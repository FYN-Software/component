import Component from './component.js';
import { property } from './decorators.js';

export default abstract class FormAssociated<T extends FormAssociated<T, TValue, TType>, TValue = string, TType = string> extends Component<FormAssociated<T, TValue, TType>&T>
{
    static formAssociated: boolean = true;

    @property()
    public required: boolean = false;

    @property()
    public tabIndex: number = 0;

    @property()
    public type: TType = '' as any;

    @property()
    public label: string = '';

    @property()
    public name: string = '';

    @property()
    public value: TValue = '' as any;

    @property()
    public error: string = '';

    @property()
    public inputMode: string = '';

    public constructor(args: ViewModelArgs<FormAssociated<T, TValue, TType>&T> = {})
    {
        super(args);

        // this.setValidity({ valueMissing: true }, 'Field may not empty');
    }

    protected async init(): Promise<void>
    {
        await super.init();

        this.observe({
            value: (o: TValue, n: TValue) => {
                // TODO(Chris Kruining) Do validation

                // TODO(Chris Kruining) This plain String cast is obviously wrong...
                this.internals.setFormValue(String(n));
            },
        });
    }

    public setValidity(state: ValidityState, error: string)
    {
        this.internals.setValidity(state, error);
        this.error = error;
    }

    public get form()
    {
        return this.internals.form;
    }

    public get validity()
    {
        return this.internals.validity;
    }

    public get validationMessage()
    {
        return this.internals.validationMessage;
    }

    public get willValidate()
    {
        return this.internals.willValidate;
    }

    public checkValidity()
    {
        return this.internals.checkValidity();
    }

    public reportValidity()
    {
        return this.internals.reportValidity();
    }
}