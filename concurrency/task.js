export default class Task extends EventTarget
{
    constructor(callable, ...args)
    {
        super();

        let lastP;
        let messages = [];

        const worker = new Worker(
            typeof callable === 'string'
                ? callable
                : URL.createObjectURL(new Blob([ `(${ callable })(self, ...JSON.parse('${JSON.stringify(args)}'))` ]))
        );
        worker.onmessage = e => {
            if(Array.isArray(e.data) === false)
            {
                return;
            }

            const [ i, r ] = e.data;

            if(messages.hasOwnProperty(i) === false)
            {
                return;
            }

            messages[i](r);

            delete messages[i];
        };

        const proxy = new Proxy(() => {}, {
            get: (c, p) => {
                if(p in this)
                {
                    let v = this[p];

                    if(typeof v === 'function')
                    {
                        v = v.bind(this);
                    }

                    return v;
                }

                lastP = p;

                return proxy;
            },
            apply: (c, s, a) => {
                const promise = new Promise(r => messages.push(r));

                worker.postMessage([ messages.length - 1, lastP, a ]);

                return promise;
            }
        });

        return proxy;
    }
}