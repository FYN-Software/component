export default class Class
{
    constructor(name)
    {
        this._name = name;
        this._extends = null;
        this._methods = [];
    }

    extends(classDef)
    {
        this._extends = classDef;

        return this;
    }

    addMethod(m)
    {
        this._methods.push(m);

        return this;
    }

    get code()
    {
        let parameters = {};
        let parts = [ `class ${this._name.upperCaseFirst()}` ];

        if(this._extends !== null)
        {
            parameters[this._extends.name] = this._extends;
            parts.push(`extends ${this._extends.name}`);
        }

        const c = `${parts.join(' ')} { ${this._methods.map(m => m.string).join('\n\n')} }`;
        const f = Function(`'use strict'; return (${Object.keys(parameters).join(', ')}) => ${c};`)();

        return f(...Object.values(parameters));
    }
}
