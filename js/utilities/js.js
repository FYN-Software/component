"use strict";

export default class Js
{
    static load(url)
    {
        return import(url);
    }

    static legacyLoad(url)
    {
        return new Promise((res, rev) => {
            const script = document.createElement('script');
            script.onload = () => res();
            script.onerror = () => rev();
            script.src = url;

            document.head.appendChild(script);
        });
    }
}
