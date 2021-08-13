import Directive from './directive.js';

export default class For extends Directive
{
    public static async parse(template: TemplateConstructor, binding: CachedBinding, node: Attr): Promise<DirectiveParseResult>
    {
        const [ n, variable ] = binding.callable.code.split(/\s+(?:of|in)\s+/);

        if(n === undefined || variable === undefined)
        {
            throw new SyntaxError(
                `unable to parse the iterable and/or variable from '${binding.callable.code}'.`
            );
        }

        const match = n.match(/^\[?\s*(?:(\S+?)\s*(?:,|:)\s*)?\s*(\S+?)]?$/);

        if(match === null)
        {
            throw new SyntaxError(
                `Unable to parse variable from '${n}'`
            );
        }

        const [ name = 'it', key = name ] = match.reverse();

        const result = await super.parse(template, binding, node);
        result.keys = [ name, key ]

        binding.callable = {
            args: binding.callable.args,
            code: variable,
        };
        binding.directive = {
            ...binding.directive!,
            keys: [ name, key ],
            name,
            key,
        };

        return result;
    }
}

async function *valueIterator(value: any): AsyncGenerator<[ number, string|number, any ], void, void>
{
    try
    {
        if (typeof value?.[Symbol.asyncIterator] === 'function')
        {
            let i = 0;
            for await(const v of value)
            {
                yield [i, i, v];

                i++;
            }
        }
        else if (typeof value?.[Symbol.iterator] === 'function')
        {
            let i = 0;
            for (const v of value)
            {
                yield [i, i, v];

                i++;
            }
        }
        else
        {
            let i = 0;
            for await(const [k, v] of Object.entries(value ?? {}))
            {
                yield [i, k, v];

                i++;
            }
        }
    }
    catch (e)
    {
        console.trace(value);
        throw e;
    }
}