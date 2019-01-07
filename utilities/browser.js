import Address from './address.js';

export default class Browser
{
    constructor()
    {
        this._callbacks = {};

        window.addEventListener('popstate', e =>
{
            e.preventDefault();

            let key = e.state !== null
                ? e.state.key
                : '__no_state__',

             data = e.state !== null
                ? e.state.data
                : {};

            if(!this._callbacks.hasOwnProperty(key))
            {
                return;
            }

            for(let callback of this._callbacks[key])
            {
                callback(data);
            }
        });
    }

    static meta(name)
    {
        try
        {
            return document.head.querySelector(`meta[name="${name}"]`).getAttribute('content');
        }
        catch(e)
        {
            return null;
        }
    }

    static script(name)
    {
        try
        {
            return Array.from(new URL(document.getElementById(name).src).searchParams)
                .reduce((t, [ k, v ]) =>
{
                    t[k] = v;

                    return t;
                }, {});
        }
        catch(e)
        {
            return {};
        }
    }

    static set(page, obj, data, replace = false)
    {
        let update = false,
         url = '';

        for(let key in obj)
        {
            let result = Address.set(key, obj[key], url);

            if(result.changed)
            {
                update = true;
                url = result.url;
            }
        }

        if(update === true || replace === true)
        {
            window.history[replace === true ? 'replaceState' : 'pushState']({ key: page, data }, '', url);
        }

        return Browser.instance;
    }

    static on(key, callback)
    {
        let inst = Browser.instance;

        if(!inst._callbacks.hasOwnProperty(key))
        {
            inst._callbacks[key] = [];
        }

        inst._callbacks[key].push(callback);

        return inst;
    }

    static get address()
    {
        return Address;
    }

    static get cookie()
    {
        return Cookie;
    }

    static get instance()
    {
        if(!Browser._instance)
        {
            Browser._instance = new Browser();
        }

        return Browser._instance;
    }
}

Browser.instance;
