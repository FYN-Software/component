export default abstract class Directive {
    private static _registry;
    private static _references;
    static get type(): string | undefined;
    static parse(template: TemplateConstructor, binding: CachedBinding, node: Attr): Promise<DirectiveParseResult>;
}
//# sourceMappingURL=directive.d.ts.map