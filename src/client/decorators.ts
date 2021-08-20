import Base from './base.js';

export function property<T extends IBase<T, T['events']>>(options: PropertyConfig<T> = {}): PropertyDecorator
{
    return (target: Object, key: string|symbol) => {
        Base.registerProperty<T>(target.constructor as BaseConstructor<T, T['events']>, key as keyof T, options);
    };
}

export function range<TComponent>(min: number, max?: number): PropertyDecorator
{
    return (target: Object, key: string|symbol) => {
        // console.log(Reflect.getPrototypeOf(target), key);
    };
}