export default abstract class Directive<T extends IBase<T>> {
    private static _registry;
    private static _references;
    static get type(): string | undefined;
    static scan(id: string, node: Attr, map: Map<string, any>, allowedKeys?: Array<string>): Promise<void>;
}
//# sourceMappingURL=directive.d.ts.map