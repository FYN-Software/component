import MagicString from 'magic-string';

export default abstract class Directive
{
    private static _registry: Map<string, string> = new Map();
    private static _references: WeakMap<DirectiveConstructor, string> = new WeakMap();

    static get type(): string|undefined
    {
        return this._references.get(this as unknown as DirectiveConstructor);
    }

    public static async parse(template: TemplateConstructor, binding: CachedBinding, node: Attr): Promise<DirectiveParseResult>
    {
        binding.directive = {
            node,
            type: this.name.toLowerCase(),
        };

        return {
            node: node.ownerElement!,
            keys: undefined,
        };
    }
}