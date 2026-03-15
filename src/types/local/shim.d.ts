export {};
declare global {
  // the es5 lib declarations only accept strings as input
  function parseInt(n: number, radix?: number): number;
  function parseFloat(n: number): number;

  interface Window {
    apntag: any;
  }
}
