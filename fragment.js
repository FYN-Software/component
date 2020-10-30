import Component from './component.js';

export default class Fragment
{
    #template;
    #map;

    constructor(template, map)
    {
        if(template instanceof Fragment)
        {
            console.error(template);
        }

        this.#template = template;
        this.#map = map;
    }

    clone()
    {
        return new Fragment(
            this.#template.cloneNode(true),
            new Map(this.#map),
        )
    }

    async load()
    {
        await Promise.all(
            Array.from(this.#template.querySelectorAll(':not(:defined)'))
                .unique()
                .map(n => Component.load(n.localName))
        );
    }

    toString()
    {
        const template = this.#template.innerHTML.replace('`', '\\`');
        const map = `{${Array.from(this.#map.entries(), ([ id, { callable, code, keys, original, directive = null } ]) => {            
            return `'${id}': {
                callable: ${callable.toString()},
                code: '${code}',
                original: '${original}',
                keys: [ ${keys.map(k => `'${k}'`).join(', ')} ],
                directive: null,
            },`;
        }).join('\n')}}`

        return `new Fragment(DocumentFragment.fromString(\`${template}\`), ${map})`;
    }

    get template()
    {
        return this.#template;
    }

    get map()
    {
        return this.#map;
    }
}