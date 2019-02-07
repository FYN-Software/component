export default class Method
{
    constructor(name)
    {
        this._name = name;
        this._getterSetter = null;
        this._static = false;
        this._body = '';
    }

    getter()
    {
        this._getterSetter = 'get';

        return this;
    }

    setter()
    {
        this._getterSetter = 'get';

        return this;
    }

    static()
    {
        this._static = true;

        return this;
    }

    body(content)
    {
        this._body = content;

        return this;
    }

    get code()
    {
        let parameters = {};

        const c = `(${Object.keys(parameters).join(', ')}) => ${this.string}`;

        return Function(`'use strict'; return ${c};`)()(...Object.values(parameters));
    }

    get string()
    {
        let parts = [];

        if(this._static === true)
        {
            parts.push('static');
        }

        if(this._getterSetter !== null)
        {
            parts.push(this._getterSetter);
        }

        parts.push(`${this._name.toCamelCase()}()`);

        return `${parts.join(' ')} { ${this._body} }`;
    }
}
