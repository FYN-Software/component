export const abstract = C => class extends C
{
    constructor()
    {
        if(new.target === C)
        {
            throw new Error('Class is abstract, needs an concrete implementation to function properly');
        }

        super();
    }
};
