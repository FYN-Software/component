import * as Comlink from '@comlink';

console.log('TEST');

Comlink.expose(class Test
{
    static async test(message)
    {
        console.log(message);

        return message.replace('?', '!');
    }
});