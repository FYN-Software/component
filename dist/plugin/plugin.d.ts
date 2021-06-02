export default class Plugin extends EventTarget implements IPlugin {
    private _bindings;
    get bindings(): Array<any>;
    get key(): string;
    get plugin(): IPlugin;
    static discover<T extends IBase<T>>(plugins: Array<IPlugin>, scope: IScope<T>, binding: IBinding<T>, callback: (...wrappedArgs: Array<any>) => Promise<any>): Promise<void>;
}
//# sourceMappingURL=plugin.d.ts.map