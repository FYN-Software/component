import DynamicObject from './dynamicObject.js';

export default class Css extends DynamicObject
{
    constructor()
    {
        super();
    }

    static __get(property)
    {
        let results = [];

        for(let sheet of document.styleSheets)
        {
            if(sheet.href !== null && sheet.href.includes('vendor'))
            {
                continue;
            }

            try
            {
                for(let rule of sheet.cssRules)
                {
                    let selector = rule.selectorText;

                    if(selector && selector.includes(property))
                    {
                        results.push(rule);
                    }
                }
            }
            catch(e)
            {
                // Suppresses exceptions
            }
        }

        return results;
    }

    __get(p)
    {
        return Css[p];
    }
}
