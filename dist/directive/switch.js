import Template, { uuidRegex } from '../template.js';
import Directive from './directive.js';
import Fragment from '../fragment.js';
export default class Switch extends Directive {
    constructor(owner, scope, node, binding, { defaultCase, cases }) {
        super(owner, scope, node, binding);
        this._items = [];
        this._defaultCase = defaultCase;
        this._cases = cases;
        this._initialized = this._initialize();
    }
    async _initialize() {
        this._items = [];
        await Promise.all(Array.from(this._cases.values()).map(c => c.load()));
    }
    async render() {
        const element = this.node;
        element.setAttribute('hidden', '');
        await this._initialized;
        const current = element.querySelector('[case]');
        if (current !== null) {
            current.remove();
        }
        const value = String(await this.binding.value);
        const fragment = this._cases.get(value) ?? this._defaultCase;
        const { template, bindings } = await Template.parseHtml(this.owner, this.scope, fragment, this.owner.properties);
        element.appendChild(template);
        await Promise.all(bindings.map(b => b.resolve(this.scope, this.owner)));
        await Promise.all(bindings
            .map(b => b.nodes)
            .reduce((t, n) => [...t, ...n], [])
            .unique()
            .map(n => Template.render(n)));
        element.removeAttribute('hidden');
    }
    static async scan(node, map, allowedKeys = []) {
        const [, uuid] = node.nodeValue.match(new RegExp(uuidRegex, ''));
        const mapping = map.get(uuid);
        const fragment = new DocumentFragment();
        fragment.appendChild(node.ownerElement.querySelector(':scope > [default]') ?? document.createTextNode(''));
        const defaultCase = await Template.cache(fragment, allowedKeys);
        const cases = new Map();
        for (const n of node.ownerElement.querySelectorAll(':scope > [case]')) {
            const fragment = new DocumentFragment();
            fragment.appendChild(n);
            cases.set(n.getAttribute('case'), await Template.cache(fragment, allowedKeys));
        }
        mapping.directive = {
            type: this.type,
            defaultCase,
            cases,
        };
        return mapping.fragment;
    }
    static async deserialize(mapping) {
        const cases = new Map();
        for (const [k, c] of mapping.cases.entries()) {
            const { html, map } = await Template.deserialize(c);
            cases.set(k, new Fragment(html, map));
        }
        const { html, map } = await Template.deserialize(mapping.defaultCase);
        mapping.defaultCase = new Fragment(html, map);
        mapping.cases = cases;
    }
}
//# sourceMappingURL=switch.js.map