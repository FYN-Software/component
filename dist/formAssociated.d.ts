import Component from './component.js';
export default abstract class FormAssociated<T extends FormAssociated<T, TValue, TType>, TValue = string, TType = string> extends Component<FormAssociated<T, TValue, TType> & T> {
    static formAssociated: boolean;
    required: boolean;
    tabIndex: number;
    type: TType;
    label: string;
    name: string;
    value: TValue;
    error: string;
    inputMode: string;
    constructor(args?: ViewModelArgs<FormAssociated<T, TValue, TType> & T>);
    protected init(): Promise<void>;
    setValidity(state: ValidityState, error: string): void;
    get form(): HTMLFormElement | undefined;
    get validity(): ValidityState;
    get validationMessage(): string;
    get willValidate(): boolean;
    checkValidity(): boolean;
    reportValidity(): boolean;
}
//# sourceMappingURL=formAssociated.d.ts.map