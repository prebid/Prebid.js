export {};
declare global {
    // the es5 lib declaration only accepts strings as input
    function parseInt(n: number, radix?: number): number;
}
