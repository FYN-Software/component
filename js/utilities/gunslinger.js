'use strict';

import Grammar from './code/grammar.js';
import Token from './code/token.js';
import Parser from './code/parser.js';

export default class Gunslinger extends Grammar
{
    static instanciate()
    {
        let lastLength = -1;

        return Parser.fromConfig({
            loopKeyword: /\s+(in|limit|step|where|group(?: |-|_)?(?:b|B)y)\s+/,
            variable: /[a-zA-Z][a-zA-Z0-9\-_]*/,
            range: /\[\d*..\d*]/,
            arrayOpenTag: /\[/,
            arrayCloseTag: /]/,
            scopeOpenTag: /\(/,
            scopeCloseTag: /\)/,
            listOperator: /,/,
            propertyAccessor: /\./,
            token: /./,
        }, {
            Loop: tokens => {
                if(tokens.every(t => t.name !== 'loopKeyword'))
                {
                    return [ [], [], tokens ];
                }

                let index = -1;
                let buffer = [
                    new Token('loopKeyword', 'target', -1, -1),
                    new Token('child', 0, -1, -1)
                ];
                let children = [ [] ];
                let childIndex = 0;

                for(let [ i, t ] of Object.entries(tokens))
                {
                    index = Number.parseInt(i);

                    if(t.name === 'loopKeyword')
                    {
                        buffer.push(t);

                        childIndex++;
                        children[childIndex] = [];
                        buffer.push(new Token('child', childIndex, -1, -1));

                        continue;
                    }

                    children[childIndex].push(t);
                }

                return [ buffer, children, [] ];
            },
            Property: tokens => {
                if(tokens.length === 0 || tokens[0].name !== 'variable')
                {
                    return [ [], [], tokens ];
                }

                let depth = 0;
                let index = -1;
                let buffer = [];
                let children = [];
                let childIndex = -1;
                let start = 0;

                for(let [ i, t ] of Object.entries(tokens))
                {
                    if(depth === 0 && [ 'arrayOpenTag', 'propertyAccessor', 'variable'].includes(t.name) !== true)
                    {
                        break;
                    }

                    index = Number.parseInt(i);

                    if(t.name === 'arrayOpenTag')
                    {
                        if(depth === 0)
                        {
                            childIndex++;
                            children[childIndex] = [];
                            start = tokens.start;
                        }

                        depth++;
                        continue;
                    }

                    if(t.name === 'arrayCloseTag')
                    {
                        depth--;

                        if(depth === 0)
                        {
                            buffer.push(new Token('child', childIndex, start, t.end));
                        }

                        continue;
                    }

                    if(depth > 0)
                    {
                        children[childIndex].push(t);
                        continue;
                    }

                    buffer.push(t);
                }

                if(depth !== 0 || index === -1)
                {
                    throw new Error('Property could not be parsed properly')
                }

                return [ buffer, children, tokens.slice(index + 1) ];
            },
            Function: (tokens, stream) => {
                if(tokens.length === 0 || tokens[0].name !== 'scopeOpenTag' || stream.last.name !== 'Property')
                {
                    return [ [], [], tokens ];
                }

                let depth = 0;
                let index = -1;
                let children = [];
                let childrenIndex = 0;

                for(let [ i, t ] of Object.entries(tokens))
                {
                    if(t.name === 'scopeOpenTag')
                    {
                        depth++;
                        continue;
                    }

                    if(t.name === 'scopeCloseTag')
                    {
                        depth--;

                        if(depth === 0)
                        {
                            index = Number.parseInt(i);
                            break;
                        }
                    }

                    if(depth === 1 && t.name === 'listOperator')
                    {
                        childrenIndex++;
                        continue;
                    }

                    if(depth > 0)
                    {
                        if(children.hasOwnProperty(childrenIndex) !== true)
                        {
                            children[childrenIndex] = [];
                        }

                        children[childrenIndex].push(t);
                    }
                }

                if(depth !== 0 || index === -1)
                {
                    throw new Error('Function could not be parsed properly')
                }

                return [ [], children, tokens.slice(index + 1) ];
            },
            Expression: tokens => {
                if(tokens.length === lastLength)
                {
                    return [ tokens, [], [] ];
                }

                lastLength = tokens.length;
                return [ [], [], tokens ];
            },
        });
    }
}