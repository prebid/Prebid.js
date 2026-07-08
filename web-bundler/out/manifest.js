import manifest from 'manifest.json';

const cb = new URL(document.currentScript.src).searchParams.get('callback');
window[cb](manifest);
