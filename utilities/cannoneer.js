import { Grammar, Token, Parser } from '../../glp/index.js';

export default class Cannoneer extends Grammar
{
    static instanciate()
    {
        let lastLength = -1;

        return Parser.fromConfig({
            rangeOpenTag: /\[/,
            rangeCloseTag: /]/,
            groupOpenTag: /\(/,
            groupCloseTag: /\)/,
            groupName: /\?<([a-zA-Z]+)>/,
            letter: /[a-zA-Z]/,
            digit: /\\d/,
            word: /\\w/,
            quantifier: /\*|\+|\{(?<lower>\d*),(?<upper>\d*)}|\?/,
            escapeCharacter: /\\./,
            token: /./,
        }, {
            Escape: tokens => {
                return tokens.length === 0 || tokens.first.name !== 'escapeCharacter'
                    ? [ [], [], tokens ]
                    : [ tokens.slice(0, 1), [], tokens.slice(1) ];
            },
            Number: tokens => {
                return tokens.length === 0 || tokens.first.name !== 'digit'
                    ? [ [], [], tokens ]
                    : [ tokens.slice(0, 1), [], tokens.slice(1) ];
            },
            Count: tokens => {
                return tokens.length === 0 || tokens.first.name !== 'quantifier'
                    ? [ [], [], tokens ]
                    : [ tokens.slice(0, 1), [], tokens.slice(1) ];
            },
            GroupName: tokens => {
                return tokens.length === 0 || tokens.first.name !== 'groupName'
                    ? [ [], [], tokens ]
                    : [ tokens.slice(0, 1), [], tokens.slice(1) ];
            },
            Range: tokens => {
                if(tokens.length === 0 || tokens.first.name !== 'rangeOpenTag')
                {
                    return [ [], [], tokens ];
                }

                if(tokens.map(t => t.name).includes('rangeCloseTag') !== true)
                {
                    throw new Error(`Syntax error missing ']' in regex`);
                }

                let depth = 0;
                let index = -1;
                let buffer = [ new Token('child', 0, -1, -1) ];
                let children = [ [] ];

                for(let [ i, t ] of Object.entries(tokens))
                {
                    if(t.name === 'rangeCloseTag')
                    {
                        depth--;

                        if(depth === 0)
                        {
                            index = Number.parseInt(i);
                            break;
                        }
                    }

                    if(depth > 0)
                    {
                        children[0].push(t);
                    }

                    if(t.name === 'rangeOpenTag')
                    {
                        depth++;
                        continue;
                    }
                }

                if(depth !== 0 || index === -1)
                {
                    throw new Error('Range could not be parsed properly')
                }

                return [ buffer, children, tokens.slice(index + 1) ];
            },
            Group: (tokens) => {
                if(tokens.length === 0 || tokens.first.name !== 'groupOpenTag')
                {
                    return [ [], [], tokens ];
                }

                if(tokens.map(t => t.name).includes('groupCloseTag') !== true)
                {
                    throw new Error(`Syntax error missing ']' in regex`);
                }

                let depth = 0;
                let index = -1;
                let buffer = [ new Token('child', 0, -1, -1) ];
                let children = [ [] ];

                for(let [ i, t ] of Object.entries(tokens))
                {
                    if(t.name === 'groupCloseTag')
                    {
                        depth--;

                        if(depth === 0)
                        {
                            index = Number.parseInt(i);
                            break;
                        }
                    }

                    if(depth > 0)
                    {
                        children[0].push(t);
                    }

                    if(t.name === 'groupOpenTag')
                    {
                        depth++;
                        continue;
                    }
                }

                if(depth !== 0 || index === -1)
                {
                    throw new Error('Group could not be parsed properly')
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
