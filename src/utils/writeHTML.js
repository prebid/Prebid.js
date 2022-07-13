/**
 * Replace the contents of `element` with the given `html` string, running all scripts contained within it.
 *
 * @param element the container element. Must be in the DOM.
 * @param html HTML string
 */
export function replaceHTML(element, html) {
  element.innerHTML = html;
  rebuildScriptsIn(element);
}

/**
 * Append some html to the contents of `element`, running all scripts contained within it.
 *
 * @param element the container element to append to. Must be in the DOM.
 * @param html HTML string
 */
export function appendHTML(element, html) {
  const container = element.ownerDocument.createElement('template');
  container.innerHTML = html;

  Array.from(container.content.childNodes).forEach((node) => {
    if (node?.tagName === 'SCRIPT') {
      node = cloneScript(node);
    }
    if (typeof node?.querySelectorAll === 'function') {
      rebuildScriptsIn(node);
    }
    element.appendChild(node);
  });
}

function cloneScript(node) {
  const repl = node.ownerDocument.createElement('script');
  Array.from(node.attributes).forEach((attr) => repl.setAttribute(attr.name, attr.value));
  repl.appendChild(node.ownerDocument.createTextNode(node.innerHTML));
  return repl;
}

function rebuildScriptsIn(container) {
  container.querySelectorAll('script').forEach((node) => {
    node.parentNode.replaceChild(cloneScript(node), node);
  });
}
