import { Event } from './utilities.js';

Number.couldBeNumber = function(val)
{
    return Number.isNaN(Number.parseInt(val)) !== true;
};

String.prototype.toDashCase = function()
{
    return this.replace(/([A-Z])/g, (w, u) => `-${ u.toLowerCase() }`).replace(/^-+|-+$/g, '');
};

String.prototype.toCamelCase = function()
{
    return this.replace(/-([a-z])/g, (w, m) => m.toUpperCase());
};
String.prototype.upperCaseFirst = function()
{
    return this.replace(/^[a-zA-Z]/, m => m.toUpperCase());
};

String.prototype.capitalize = function()
{
    return this.charAt(0).toUpperCase() + this.slice(1);
};

Array.compare = function(arr1, arr2)
{
    return arr1.compare(arr2);
};
Object.defineProperty(Array, 'compare', { enumerable: false });

Array.prototype.compare = function(arr2)
{
    if(this.length !== arr2.length)
    {
        return false;
    }

    for(let i = 0; i < this.length; i++)
    {
        if(this[i] instanceof Array && arr2[i] instanceof Array)
        {
            if(!this[i].compare(arr2[i]))
            {
                return false;
            }
        }
        else if(this[i] !== arr2[i])
        {
            return false;
        }
    }

    return true;
};

Object.defineProperty(Array.prototype, 'compare', { enumerable: false });
Object.defineProperty(Array.prototype, 'first', {
    enumerable: false,
    get: function()
    {
        return this[0];
    },
});
Object.defineProperty(Array.prototype, 'last', {
    enumerable: false,
    get: function()
    {
        return this[this.length - 1];
    },
});
Object.defineProperty(Array.prototype, 'sum', {
    enumerable: false,
    get: function()
    {
        return this.reduce((t, v) => t + v, 0);
    },
});

Array.prototype.unique = function()
{
    return this.filter((v, i, a) => a.indexOf(v) === i);
};

Math.clamp = function(lower, upper, value)
{
    return Math.min(Math.max(value, lower), upper);
};

Math.mod = function(n, m)
{
    return ((n % m) + m) % m;
};

DOMTokenList.prototype.toggle = function(name)
{
    this[Array.from(this).includes(name) ? 'remove' : 'add'](name);

    return this;
};

DOMTokenList.prototype.setOnAssert = function(condition, name, alt = null)
{
    if(condition)
    {
        this.add(name);

        if(alt !== null)
        {
            this.remove(...Array.isArray(alt) ? alt : [ alt ]);
        }
    }
    else
    {
        this.remove(name);

        if(alt !== null)
        {
            this.add(...Array.isArray(alt) ? alt : [ alt ]);
        }
    }

    return this;
};

NamedNodeMap.prototype.setOnAssert = function (condition, name, value = '')
{
    if(Array.isArray(name))
    {
        for(let n of name)
        {
            this.setOnAssert(condition, n, value);
        }
    }
    else
    if(condition === true)
    {
        let attr = document.createAttribute(name);
        attr.value = value;

        this.setNamedItem(attr);
    }
    else if(condition === false && this.getNamedItem(name) !== null)
    {
        this.removeNamedItem(name);
    }

    return this;
};

EventTarget.prototype.trigger = function(name)
{
    Event.trigger(this, name);

    return this;
};

EventTarget.prototype.delegate = function(selector, settings)
{
    Event.delegate(this, selector, settings);

    return this;
};

EventTarget.prototype.on = function(settings)
{
    Event.on(this, settings);

    return this;
};

EventTarget.prototype.emit = function(name, data = {}, composed = false)
{
    this.dispatchEvent(new CustomEvent(name, {
        detail: data,
        bubbles: true,
        composed,
    }));

    return this;
};

HTMLElement.prototype.getOuterClientRect = function()
{
    let style = window.getComputedStyle(this);
    let rect = this.getBoundingClientRect();

    return {
        height: rect.height + parseFloat(style.marginBottom) + parseFloat(style.marginTop),
        width: rect.width + parseFloat(style.marginLeft) + parseFloat(style.marginRight),
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
    };
};

HTMLElement.prototype.index = function()
{
    return Array.from(this.parentNode.children).indexOf(this);
};

HTMLElement.prototype.cloneStyle = function(src, s = null)
{
    const style = window.getComputedStyle(src);

    Array.from(style).filter(k => s === null || s.some(p => k.includes(p)))
        .forEach(k => this.style.setProperty(
            k,
            style.getPropertyValue(k),
            style.getPropertyPriority(k)
        ));

    return this;
};

HTMLElement.prototype.insertAfter = function(newChild, refChild)
{
    if(refChild.nextSibling !== null)
    {
        this.insertBefore(newChild, refChild.nextSibling);
    }
    else
    {
        this.appendChild(newChild);
    }

    return this;
};

HTMLFormElement.prototype.toObject = function(useLabel = false)
{
    return objectFromEntries(Array.from(this)
        .filter(i => i.id.length > 0 && (i.type === 'checkbox' ? i.checked : true))
        .map(f => [ useLabel ? f.label : f.name, f.value ])
        .filter(([ , v ]) => v.length > 0));
};

Node.prototype.childOf = function(parent)
{
    let el = this.parentNode;

    while(el !== null)
    {
        if(el === parent)
        {
            return true;
        }

        el = el.parentNode;
    }

    return false;
};

HTMLElement.prototype.extract = function(template = true)
{
    let item = this.parentNode.removeChild(this);

    if(template === true)
    {
        item.removeAttribute('template');
    }

    return item;
};

NodeList.prototype.first = function(callback, ...args)
{
    if(this.length === 0)
    {
        return null;
    }

    if(callback !== undefined)
    {
        callback.apply(this[0], args);
    }

    return this[0];
};

NodeList.prototype.on = function(settings, ...args)
{
    if(!(settings instanceof Object))
    {
        throw new Error('first argument must be an object');
    }

    this.forEach(el => el.on.apply(el, [ settings, ...args ]));

    return this;
};

HTMLCollection.prototype.on = NodeList.prototype.on;

NodeList.prototype.clear = function()
{
    Array.from(this).forEach(e => e.remove());

    return this;
};

HTMLCollection.prototype.clear = NodeList.prototype.clear;

Array.prototype.apply = function(callback, ...args)
{
    return Array.from(this).map(i => callback.apply(i, args));
};

NamedNodeMap.prototype.apply    = Array.prototype.apply;
NodeList.prototype.apply        = Array.prototype.apply;
HTMLCollection.prototype.apply  = Array.prototype.apply;

CSSStyleDeclaration.prototype.toggle = function(name, a, b)
{
    this[name] = this[name] === a
        ? b
        : a;
};

NamedNodeMap.prototype.toggle = function(key)
{
    if(Array.from(this).some(i => i.name === key))
    {
        this.removeNamedItem(key);
    }
    else
    {
        let attr = document.createAttribute(key);
        attr.value = '';
        this.setNamedItem(attr);
    }
};

JSON.tryParse = function(str, ret = false)
{
    try
    {
        str = JSON.parse(str);
    }
    catch(e)
    {
        if(ret === true)
        {
            return null;
        }
    }

    return str;
};

Promise.prototype.delay = function(d)
{
    return this.then(data => new Promise(r => setTimeout(() => r(data), d)));
};
Promise.delay = function(d)
{
    return Promise.resolve(null).delay(d);
};
Promise.prototype.stage = function(cb)
{
    return this.then(data =>
    {
        let res = cb(data);

        if((res instanceof Promise) === false)
        {
            res = Promise.resolve(null);
        }

        return res.then(() => data);
    });
};

Promise.prototype.chain = function (array, callback, delay = 0)
{
    let options = { delay };

    try
    {
        return Promise.resolve(array
            .map(i => () => new Promise(r => setTimeout(() => r(callback(i, options)), options.delay)))
            .reduce((p, p2) => p.then(p2), Promise.resolve())
        );
    }
    catch(e)
    {
        return Promise.resolve(null);
    }
};

Promise.prototype.log = function ()
{
    // eslint-disable-next-line no-console
    return this.stage(console.log);
};

DocumentFragment.fromString = function(str)
{
    const temp = document.createElement('template');
    temp.innerHTML = str;

    return temp.content;
};
Object.defineProperty(DocumentFragment, 'fromString', { enumerable: false });

DOMRect.prototype.contains = function(x, y)
{
    return (x > this.left && x < this.right) && (y > this.top && y < this.bottom);
};

export function clone(obj, root = null)
{
    if(obj === null || typeof obj !== 'object')
    {
        return obj;
    }

    // Handle Date
    if(obj instanceof Date)
    {
        let copy = new Date();
        copy.setTime(obj.getTime());

        return copy;
    }

    if(root === null)
    {
        root = obj;
    }

    // Handle Array
    if(obj instanceof Array)
    {
        return obj.reduce((t, i) =>
        {
            if(!Object.is(i, root))
            {
                t.push(clone(i));
            }

            return t;
        }, []);
    }

    // Handle Object
    if(obj instanceof Object)
    {
        return Object.entries(obj).reduce((t, [ k, v ]) =>
        {
            if(!Object.is(v, root) && !k.startsWith('__'))
            {
                t[k] = clone(v, root);
            }

            return t;
        }, {});
    }

    throw new Error('Unable to copy obj! Its type isn\'t supported.');
}

export function objectFromEntries(arr)
{
    return arr.reduce((t, [ n, v ]) =>
    {
        t[n] = v;

        return t;
    }, {});
}
