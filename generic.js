import Component from './component.js';

export default class Generic extends Component
{
    constructor(node)
    {
        Component.register(new.target);

        super(Promise.delay(0).then(() => this.setTemplate(node)));

        const style = document.createElement('style');
        style.innerText = ':host { display: contents; }';

        const slot = document.createElement('slot');

        this.shadow.appendChild(style);
        this.shadow.appendChild(slot);
    }

    async setTemplate(node)
    {
        this.childNodes.clear();

        const { html: template, bindings } = this._parseHtml(node);

        const nodes = Array.from(template.querySelectorAll(':not(:defined)'));
        const dependencies = nodes.map(n => n.localName);

        await Promise.all(dependencies.unique().map(n => Component.load(n)));
        await Promise.all(nodes.filter(n => n instanceof Component).map(n => n.__ready));

        this.appendChild(template);

        return { template, bindings };
    }
}
