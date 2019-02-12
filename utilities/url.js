export function relativeToAbsolute(root, path)
{
    return `${root.substring(0, root.lastIndexOf('/'))}/${path}`;
}