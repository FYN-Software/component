export interface IObserver
{
    [Key: string]: <T>(oldValue: T, newValue : T) => void,
}

export default interface IBase
{
    observe(config: IObserver): IBase;
}