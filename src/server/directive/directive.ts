export default abstract class Directive<T extends IBase<T>>
{
    private static _registry: Map<string, string> = new Map();
    private static _references: WeakMap<DirectiveConstructor, string> = new WeakMap();

    static get type(): string|undefined
    {
        return this._references.get(this as unknown as DirectiveConstructor);
    }

    public static async scan(id: string, node: Attr, map: Map<string, any>, allowedKeys: Array<string> = []): Promise<void>
    {
        const mapping = map.get(id);

        mapping.directive = {
            type: this.name.toLowerCase(),
        };
    }
}