export const isGzipCompressionSupported: () => Promise<boolean> = (function () {
  const result = (async () => {
    try {
      if (typeof window.CompressionStream === 'undefined' || typeof window.DecompressionStream === 'undefined') {
        return false;
      }
      const probe = 'prebid-gzip-probe';
      const compressed = await compressDataWithGZip(probe);
      const decompressed = new Blob([compressed])
        .stream()
        .pipeThrough(new window.DecompressionStream('gzip'));
      return await new Response(decompressed).text() === probe;
    } catch (error) {
      return false;
    }
  })();
  return () => result;
})();

// Make sure to use isGzipCompressionSupported before calling this function
export async function compressDataWithGZip(data) {
  if (typeof data !== 'string') { // TextEncoder (below) expects a string
    data = JSON.stringify(data);
  }

  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);
  const compressedStream = new Blob([encodedData])
    .stream()
    .pipeThrough(new window.CompressionStream('gzip'));

  const compressedBlob = await new Response(compressedStream).blob();
  const compressedArrayBuffer = await compressedBlob.arrayBuffer();
  return new Uint8Array(compressedArrayBuffer);
}
