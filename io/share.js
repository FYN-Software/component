const _worker = new SharedWorker('sharedWorker.js');
const _listeners = {};
let _store = {};
let _connected = false;

_worker.port.onmessage = e =>
{
    if(
        typeof e.data !== 'object'
        || e.data.hasOwnProperty('__event__') === false
        || e.data.hasOwnProperty('__value__') === false
    )
    {
        return;
    }

    let { __event__: key, __value__: value } = e.data;

    if(_listeners.hasOwnProperty(key) === false)
    {
        return;
    }

    _listeners[key].forEach(l => l(value));
};
_worker.port.start();

export default class Share
{
    static get(key)
    {
        return _store[key] || undefined;
    }

    static set(key, value)
    {
        _store[key] = value;

        Share.fire('__valueChanged__', { key, value });
        Share.fire(key, value);
    }

    static on(options)
    {
        for(let [ key, listener ] of Object.entries(options))
        {
            if(_listeners.hasOwnProperty(key) === false)
            {
                _listeners[key] = [];
            }

            _listeners[key].push(listener);
        }
    }

    static fire(name, value = {})
    {
        _worker.port.postMessage({ __event__: name, __value__: value });
    }

    static get connected()
    {
        return _connected;
    }
}

let t;

Share.on({
    __valueChanged__: e => _store[e.key] = e.value,
    __connecting__: e => Share.fire('__connected__', _store),
    __connected__: e =>
    {
        clearTimeout(t);

        _store = e;
        _connected = true;
    },
});
Share.fire('__connecting__');

t = setTimeout(() =>
{
    _listeners['__connected__'].forEach(l => l({}));
}, 1500);
