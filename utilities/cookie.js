export default class Cookie
{
    static set(key, value = '', expiration = 1)
    {
        let d = new Date();
        d.setDate(d.getDate() + expiration);
        document.cookie = `${key}=${value};expires=${d.toUTCString()};path=/`;
    }

    static get(key)
    {
        return document.cookie
            .split(';')
            .map(p => p.split('='))
            .find(([k, v]) => k === key)[1] || null;
    }
}
