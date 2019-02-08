import Component from './component.js';

export default class Generic extends Component
{
    constructor(node)
    {
        Component.register(new.target);

        super(false);

        const style = document.createElement('style');
        style.innerHTML = ':host { display: contents; }';

        const slot = document.createElement('slot');

        this.shadow.appendChild(style);
        this.shadow.appendChild(slot);

        setTimeout(() => this.template = node, 1000);
    }

    set template(node)
    {
        this.childNodes.clear();

        const { html, bindings } = this.constructor._parseHtml(node);

        const nodes = Array.from(html.querySelectorAll(':not(:defined)'));
        const dependencies = nodes.map(n => n.localName);

        Promise.all(dependencies.unique().map(n => Component.load(n)))
            .stage(() => Promise.all(nodes.filter(n => n instanceof Component).map(n => n.__ready)))
            .stage(() => {
                this._bindings = bindings;
                this.appendChild(html);
            });
    }
}
