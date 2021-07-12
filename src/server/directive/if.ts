import Directive from './directive.js';

// TODO(Chris Kruining)
//  This directive should add the binding created
//  from its template to the owner, now values wont
//  get rendered due to this disconnect!
export default class If<T extends IBase<T>> extends Directive<T>
{
}