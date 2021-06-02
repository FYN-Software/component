import Template from '../template.js';
import Base from '../base.js';
import Directive from './directive.js';
// TODO(Chris Kruining)
//  This directive should add the binding created
//  from its template to the owner, now values wont
//  get rendered due to this disconnect!
export default class If extends Directive {
    constructor(owner, scope, node, binding, { fragment }) {
        super(owner, scope, node, binding);
        this._initialized = Promise.resolve();
        this._fragment = fragment;
        this._initialized = this._initialize();
    }
    async _initialize() {
        await this._fragment.load();
    }
    async render() {
        this.node.setAttribute('hidden', '');
        await this._initialized;
        const value = Boolean(await this.binding.value);
        this.node.attributes.setOnAssert(value === false, 'hidden');
        if (value) {
            this.node.innerHTML = '';
            const { template, bindings } = await Base.parseHtml(this.owner, this.scope, this._fragment);
            this.node.appendChild(template);
            await Promise.all(bindings.map(b => b.resolve(this.scope, this.owner)));
            await Promise.all(bindings.map(b => b.nodes)
                .reduce((t, n) => [...t, ...n], [])
                .unique()
                .map(n => Template.render(n)));
        }
    }
}
//# sourceMappingURL=if.js.map