export {};
declare global {
  // the es5 lib declarations only accept strings as input
  function parseInt(n: number, radix?: number): number;
  function parseFloat(n: number): number;

  interface ApnTag {
    getTag?: (unit: string) => { keywords?: Record<string, string> } | undefined;
    modifyTag?: (unit: string, tag: { keywords?: Record<string, string> }) => void;
    setKeywords?: (targetId: string, keywords: Record<string, string>, options?: { overrideKeyValue?: boolean }) => void;
    anq?: Array<() => void>;
    onEvent?: (eventName: string, callback: () => void) => void;
    [key: string]: unknown;
  }

  interface Window {
    apntag?: ApnTag;
  }
}
