'use strict';

import { Grammar, Token, Parser } from '../../glp/index.js';

export default class Gunslinger extends Grammar
{
    static instanciate()
    {
        let lastLength = -1;

        return Parser.fromConfig({
            loopKeyword: /\s+(in|limit|step|where|group(?: |-|_)?(?:b|B)y)\s+/,
            variable: /[a-zA-Z_][a-zA-Z0-9\-_]*/,
            arrayOpenTag: /\[/,
            arrayCloseTag: /]/,
            scopeOpenTag: /\(/,
            scopeCloseTag: /\)/,
            listOperator: /,/,
            propertyAccessor: /\./,
            token: /./,
        }, {
            Range: tokens => {
                if(tokens.length === 0 || tokens[0].name !== 'arrayOpenTag')
                {
                    return [ [], [], tokens ];
                }

                let depth = 0;
                let index = -1;
                let buffer = [];
                let children = [];
                let childrenIndex = 0;
                let start = 0;
                let skip = false;

                for(let [ i, t ] of Object.entries(tokens))
                {
                    if(skip === true)
                    {
                        skip = false;

                        continue;
                    }

                    if(depth === 1 && t.name === 'propertyAccessor' && tokens[Number.parseInt(i) + 1].name === 'propertyAccessor')
                    {
                        childrenIndex++;
                        skip = true;

                        continue;
                    }

                    if(t.name === 'arrayCloseTag')
                    {
                        depth--;

                        if(depth === 0)
                        {
                            buffer.push(new Token('child', childrenIndex, start, t.end));
                            index = Number.parseInt(i);
                            break;
                        }
                    }

                    if(depth > 0)
                    {
                        if(children.hasOwnProperty(childrenIndex) !== true)
                        {
                            children[childrenIndex] = [];
                        }

                        children[childrenIndex].push(t);
                    }

                    if(t.name === 'arrayOpenTag')
                    {
                        depth++;
                        continue;
                    }
                }

                if(depth !== 0 || index === -1)
                {
                    console.error(depth, index);

                    throw new Error('Range could not be parsed properly')
                }

                return [ buffer, children, tokens.slice(index + 1) ];
            },
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
                if(tokens.length === 0 || tokens[0].name !== 'scopeOpenTag' || stream.length === 0 || stream.last.name !== 'Property')
                {
                    return [ [], [], tokens ];
                }

                const name = stream.pop();

                let depth = 0;
                let index = -1;
                let buffer = [ new Token('child', 0, -1, -1) ];
                let children = [ name.tokens ];
                let childrenIndex = 1;
                let start = 0;

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
                            // TODO(Chris Kruining)
                            //  Fix start, the value
                            //  is never updated
                            buffer.push(new Token('child', childrenIndex, start, t.end));
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

                return [ buffer, children, tokens.slice(index + 1) ];
            },
            Scope: (tokens) => {
                if(tokens.length === 0 || tokens[0].name !== 'scopeOpenTag')
                {
                    return [ [], [], tokens ];
                }

                let depth = 0;
                let index = -1;
                let buffer = [];
                let children = [];
                let childrenIndex = 0;
                let start = 0;

                for(let [ i, t ] of Object.entries(tokens))
                {
                    if(t.name === 'scopeCloseTag')
                    {
                        depth--;

                        if(depth === 0)
                        {
                            buffer.push(new Token('child', childrenIndex, start, t.end));
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

                    if(t.name === 'scopeOpenTag')
                    {
                        depth++;
                        continue;
                    }
                }

                if(depth !== 0 || index === -1)
                {
                    throw new Error('Function could not be parsed properly')
                }

                return [ buffer, children, tokens.slice(index + 1) ];
            },
            Expression: tokens => {
                if(tokens.length === lastLength && lastLength > 0)
                {
                    return [ [ tokens[0] ], [], tokens.slice(1) ];
                }

                lastLength = tokens.length;
                return [ [], [], tokens ];
            },
        });
    }
}
