export default class Address
{
    static set(key, value, url = '')
    {
        key = encodeURI(key);
        value = encodeURI(value);
        url = url || document.location.search;

        let str = [ key, value ].join('=');


        let parts = url.substr(url.indexOf('?') + 1).split('&')
            .filter(el => el.length > 0);


        let changed = false;


        let i;

        for(i = 0; i < parts.length; i++)
        {
            let x = parts[i].split('=');

            if(x.length !== 2)
            {
                continue;
            }

            if(x[0] === key)
            {
                if(x[1] !== value)
                {
                    changed = true;
                    parts[i] = str;
                }

                break;
            }
        }

        if(i === parts.length)
        {
            changed = true;
            parts[parts.length] = str;
        }

        return {
            changed: changed,
            url: window.location.pathname + '?' + parts.join('&'),
        };
    }

    static get(key)
    {
        key = encodeURI(key);

        let parts = document.location.search.substr(1).split('&')
            .filter(el => el.length > 0);

        for(let i = 0; i < parts.length; i++)
        {
            let x = parts[i].split('=');

            if(x.length !== 2)
            {
                continue;
            }

            if(x[0] === key)
            {
                return x[1];
            }
        }

        return null;
    }
}
