// This module, and the calls to it in videoCache and vastXmlBuilder, were written by a bot
// (Claude Code).

/**
 * Helpers for placing untrusted text into XML that is built by string concatenation.
 *
 * Element and attribute names in the documents Prebid generates are literals, so the values
 * interpolated between them are the only place a document's structure can be altered.
 */

/**
 * Wraps text in a CDATA section.
 *
 * A CDATA section ends at the first ']]>', so text containing that sequence is split across two
 * sections. A parser reading the result back sees the original text, including the ']]>'.
 */
export function cdata(text: string): string {
  return `<![CDATA[${String(text).replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}

/**
 * Escapes text for use as a double-quoted XML attribute value.
 *
 * Expects raw text: this replaces '&' with an entity reference, so applying it to its own output
 * would escape the ampersands it just produced.
 */
export function attributeValue(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}
