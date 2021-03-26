import IBase, { IObserver } from './Ibase';

interface IModel
{

}

export default class Base implements IBase
{
    #viewModel : IModel;
    #observers : Map<string, (<T>(oldValue: T, newValue: T) => void)[]>;

    public observe(config: IObserver) : IBase
    {
        for(const [ p, c ] of Object.entries(config))
        {
            if(Object.keys(this.#viewModel).includes(p) !== true)
            {
                throw new Error(`Trying to observe non-observable property '${p}'`);
            }

            if(this.#observers.has(p) === false)
            {
                this.#observers.set(p, []);
            }

            this.#observers.get(p).push(c);
        }

        return this;
    }
}