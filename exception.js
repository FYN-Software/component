export default class Exception extends Error
{
    #inner;
    #owner;

    constructor(message, inner, owner)
    {
        super(message);

        this.#inner = inner;
        this.#owner = owner;
    }
}