// NOTE(Chris Kruining)
// The lib does not yet
// export a module and
// sets itself onto the
// global variable
import * as mqttLib from 'https://unpkg.com/mqtt/dist/mqtt.min.js';
import { Browser } from '../utilities.js';

const sessionId = Browser.meta('session-id');
const client = mqtt.connect('mqtts://mqtt.fyn.nl:1885', {
        clientId: sessionId,
        username: 'Websocket',
        password: 'WatIsDitEenKutWachtwoord^%*(#!',
        will: {
            topic: 'game-over',
            payload: sessionId,
            qos: 2,
            retain: true,
        }
    });
const subscribers = {};

export default class Mqtt
{
    static publish(topic, content, headers = [])
    {
        let message = Object.assign({
            Callback: sessionId,
            MessageID: Math.random(),
            Type: Mqtt.types.IncommingCall,
            Content: content,
        }, headers);

        Mqtt.client.publish(topic, JSON.stringify(message), {
            qos: 2,
        });

        return message.MessageID;
    }

    static subscribe(topic, callback)
    {
        if(!subscribers.hasOwnProperty(topic))
        {
            subscribers[topic] = [];
            Mqtt.client.subscribe(Mqtt.session);
        }

        subscribers[topic].push(callback);
    }

    static get session()
    {
        return sessionId;
    }

    static get client()
    {
        return client;
    }

    static get types()
    {
        return {
            IncommingCall: 0,
            Subscribe: 1,
            FlashMessage: 2,
            IncommingCallNotification: 3,
            StartTransaction: 4,
            Generic: 5,
            StartTransactionInfo: 6,
            CancelTransaction: 8,
        };
    }
}

client.stream.on('error', () => client.end());

client.on('connect', () => {
    client.subscribe(sessionId, {
        qos: 2,
    });
});

client.on('message', (t, m) => {
    let data = JSON.tryParse(m.toString(), true);

    if(data === null)
    {
        return;
    }

    for(let subscriber of subscribers[Number.parseInt(data.Type)] || [])
    {
        subscriber(data);
    }
});
