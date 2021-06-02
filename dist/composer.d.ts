declare type FileType = 'html' | 'css' | 'js';
declare type Frag = {
    html: Promise<IFragment<any>>;
    css: CSSStyleSheet;
};
export default class Composer {
    private static _fragments;
    private static _registration;
    static resolve(name: string, type?: FileType): string;
    static register(...urls: Array<string>): Promise<void>;
    static prepare(template: Element): Promise<Element>;
    static get fragments(): Readonly<{
        [key: string]: Frag;
    }>;
    static registerComponent<T extends IBase<T>>(classDef: ComponentConstructor<T>): ComponentConstructor<T>;
    static load<T extends IBase<T>>(name: string): Promise<ComponentConstructor<T>>;
}
export {};
//# sourceMappingURL=composer.d.ts.map