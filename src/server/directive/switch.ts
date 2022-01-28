import Directive from './directive.js';

export default class Switch extends Directive
{
    public static async parse(binding: CachedBinding, node: Attr): Promise<DirectiveParseResult>
    {
        const result = await super.parse(binding, node);

        binding.directive = {
            ...binding.directive!,
            defaultCase: null,
            cases: [],
        };

        return result;
    }
}