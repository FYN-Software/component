import Component from './component.js';
declare type FormAssociatedEvents<TValue> = {
    change: {
        old: TValue;
        new: TValue;
    };
};
export default abstract class FormAssociated<T extends FormAssociated<T, TEvents, TValue, TType>, TEvents, TValue = string, TType = string> extends Component<FormAssociated<T, TEvents, TValue, TType> & T, FormAssociatedEvents<TValue> & TEvents> {
    static formAssociated: boolean;
    required: boolean;
    tabIndex: number;
    type: TType;
    label: string;
    name: string;
    value: TValue;
    error: string;
    inputMode: string;
    constructor(args?: Partial<FormAssociated<T, TEvents, TValue, TType> & T>);
    protected init(): Promise<void>;
    setValidity(state: ValidityState, error: string): void;
    get form(): HTMLFormElement | undefined;
    get validity(): ValidityState;
    get validationMessage(): string;
    get willValidate(): boolean;
    checkValidity(): boolean;
    reportValidity(): boolean;
}
export {};
//# sourceMappingURL=formAssociated.d.ts.map