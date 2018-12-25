"use strict";

export default class Css
{
    constructor()
    {
        this.$ = new Proxy([], {
            get: (container, property) => {
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

                    }
                }

                return results;
            }
        });
    }

    static get instance()
    {
        if(!Css._instance)
        {
            Css._instance = new Css();
        }

        return Css._instance;
    }

    static get $()
    {
        return Css.instance.$;
    }

    static load(url)
    {
        return new Promise(r => {
            let el = document.createElement('link');
            el.type = 'text/css';
            el.rel = 'stylesheet';
            el.href = url;
            el.onload = r;

            document.getElementsByTagName('head')[0].appendChild(el);
        });
    }
}
