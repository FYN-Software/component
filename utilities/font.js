function url(font, variants, onlyCharacters)
{
    const f = font.family.replace(/ /g, '+');
    const v = variants.join(',');
    let url = `https://fonts.googleapis.com/css?family=${f}:${v}`;

    if(onlyCharacters === true)
    {
        const t = font.family
            .replace(/\s+/g, '')
            .split('')
            .filter((x, n, s) => s.indexOf(x) === n)
            .join('');
        url += `&text=${t}`;
    }

    return url;
}

async function load(font, selector = null, variants = [], preview = false)
{
    return new Promise((res, rev) => {
        const l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = url(font, variants, preview);
        l.id = `font-${preview ? 'preview' : 'full'}-${selector || font.family.replace(/\s+/g, '-').toLowerCase()}`;
        l.onload = res;
        l.onerror = rev;

        document.head.appendChild(l);
    });
}

export default class Font
{
    static async fetch(font, selector = null, variants = [])
    {
        return load(font, selector, variants, false);
    }

    static async preview(font, selector = null, variants = [])
    {
        return load(font, selector, variants, true);
    }

    static async list(key)
    {
        const url = `https://www.googleapis.com/webfonts/v1/webfonts?sort=popularity&key=${key}`;

        return (await fetch(url, { headers: { 'content-type': 'application/json' } })).json();
    }
}
