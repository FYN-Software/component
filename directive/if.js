import Directive from './directive.js';

export default class If extends Directive
{
    async render()
    {
        this.node.attributes.setOnAssert(await this.binding.value !== true, 'hidden');
    }
}