import Event from './utilities/event.js';

Object.defineProperties(Number, {
    couldBeNumber: {
        value(val)
        {
            return Number.isNaN(Number.parseInt(val)) !== true;
        },
        enumerable: false,
    },
});

Object.defineProperties(String.prototype, {
    toDashCase: {
        value()
        {
            return this.replace(/([A-Z])/g, (w, u) => `-${ u.toLowerCase() }`).replace(/^-+|-+$/g, '');
        },
        enumerable: false,
    },
    toCamelCase: {
        value()
        {
            return this.replace(/-([a-z])/g, (w, m) => m.toUpperCase());
        },
        enumerable: false,
    },
    capitalize: {
        value()
        {
            return this.charAt(0).toUpperCase() + this.slice(1);
        },
        enumerable: false,
    },
});

Object.defineProperties(Array.prototype, {
    apply: {
        value(callback, ...args)
        {
            return Array.from(this).map(i => callback.apply(i, args));
        },
        enumerable: false
    },
    compare: {
        value(arr2)
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
        },
        enumerable: false
    },
    unique: {
        value()
        {
            return this.filter((v, i, a) => a.indexOf(v) === i);
        },
        enumerable: false
    },
    first: {
        enumerable: false,
        get: function()
        {
            return this[0];
        },
    },
    last: {
        enumerable: false,
        get: function()
        {
            return this[this.length - 1];
        },
    },
    sum: {
        enumerable: false,
        get: function()
        {
            return this.reduce((t, v) => t + v, 0);
        },
    },
});
Object.defineProperties(Array, {
    compare: {
        value(a, b)
        {
            return a.compare(b);
        },
        enumerable: false
    },
});

Object.defineProperties(Math, {
    clamp: {
        value(lower, upper, value)
        {
            return Math.min(Math.max(value, lower), upper);
        },
        enumerable: false,
    },
    mod: {
        value(n, m)
        {
            return ((n % m) + m) % m;
        },
        enumerable: false,
    },
});

if(EventTarget !== undefined)
{
    Object.defineProperties(EventTarget.prototype, {
        trigger: {
            value(name)
            {
                Event.trigger(this, name);

                return this;
            }
        },
        delegate: {
            value(selector, settings)
            {
                Event.delegate(this, selector, settings);

                return this;
            }
        },
        on: {
            value(settings)
            {
                Event.on(this, settings);

                return this;
            }
        },
        emit: {
            value(name, data = {}, composed = false)
            {
                this.dispatchEvent(new CustomEvent(name, {
                    detail: data,
                    bubbles: true,
                    composed,
                }));

                return this;
            }
        },
    });
}

if(typeof DOMTokenList != 'undefined')
{
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
}

if(typeof NamedNodeMap != 'undefined')
{
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

    NamedNodeMap.prototype.apply = Array.prototype.apply;
}

if(typeof HTMLElement != 'undefined')
{
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
        if(refChild.nextSibling === null)
        {
            this.appendChild(newChild);
        }
        else
        {
            this.insertBefore(newChild, refChild.nextSibling);
        }

        return this;
    };

    HTMLElement.prototype.extract = function()
    {
        return this.parentNode.removeChild(this);
    };

    HTMLFormElement.prototype.toObject = function(useLabel = false)
    {
        return objectFromEntries(Array.from(this)
            .filter(i => i.id.length > 0 && (i.type === 'checkbox' ? i.checked : true))
            .map(f => [ useLabel ? f.label : f.name, f.value ])
            .filter(([ , v ]) => v.length > 0));
    };
}

if(typeof NodeList != 'undefined')
{
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

    NodeList.prototype.clear = function()
    {
        Array.from(this).forEach(e => e.remove());

        return this;
    };

    NodeList.prototype.apply = Array.prototype.apply;
}

if(typeof HTMLCollection != 'undefined')
{
    HTMLCollection.prototype.on = NodeList.prototype.on;
    HTMLCollection.prototype.clear = NodeList.prototype.clear;
    HTMLCollection.prototype.apply = Array.prototype.apply;
}

if(typeof Node != 'undefined')
{
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
}

if(typeof Promise != 'undefined')
{
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
        return Promise.chain(array, callback, delay);
    };

    Promise.chain = function (array, callback, delay = 0)
    {
        let options = { delay };

        try
        {
            return array
                .map(i => () => new Promise(r => setTimeout(() => r(callback(i, options)), options.delay)))
                .reduce((p, p2) => p.then(p2), Promise.resolve());
        }
        catch(e)
        {
            return Promise.resolve(null);
        }
    };

    Promise.prototype.log = function (...args)
    {
        // eslint-disable-next-line no-console
        return this.stage((...a) => console.log(...a, ...args));
    };
}

if(typeof CSSStyleDeclaration != 'undefined')
{
    CSSStyleDeclaration.prototype.toggle = function(name, a, b)
    {
        this[name] = this[name] === a
            ? b
            : a;
    };
}

if(typeof JSON != 'undefined')
{
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
}

if(typeof DocumentFragment != 'undefined')
{
    DocumentFragment.fromString = function(str)
    {
        const temp = document.createElement('template');
        temp.innerHTML = str;

        return temp.content;
    };
    Object.defineProperty(DocumentFragment, 'fromString', { enumerable: false });
}

if(typeof DOMRect != 'undefined')
{
    DOMRect.prototype.contains = function(x, y)
    {
        return (x > this.left && x < this.right) && (y > this.top && y < this.bottom);
    };
}

if(typeof Promise != 'undefined')
{
}

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
        return obj.reduce((t, i) => {
            if(!Object.is(i, root))
            {
                t.push(clone(i));
            }

            return t;
        }, []);
    }

    // Handle Array
    if(obj instanceof Set)
    {
        return new Set(Array.from(obj).map(v => clone(v)));
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

export function equals(a, b)
{
    if(typeof a !== typeof b)
    {
        return false;
    }

    if(a === null || typeof a !== 'object' || b === null || typeof b !== 'object')
    {
        return a === b;
    }

    // Handle Array
    if(a instanceof Array && b instanceof Array)
    {
        return Array.compare(a, b);
    }

    // Handle Object
    if(a instanceof Object && b instanceof Object)
    {
        if(a.constructor.name !== b.constructor.name)
        {
            return false;
        }

        for(const p of Object.getOwnPropertyNames(a))
        {
            if(equals(a[p], b[p]) !== true)
            {
                return false;
            }
        }

        return true;
    }

    throw new Error(`Unable to compare ${a} and ${b}! Its type isn't supported.`);
}

export function objectFromEntries(arr)
{
    return arr.reduce((t, [ n, v ]) =>
    {
        t[n] = v;

        return t;
    }, {});
}
