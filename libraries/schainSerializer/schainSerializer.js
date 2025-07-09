/**
 * Serialize the SupplyChain for Non-OpenRTB Requests
 * https://github.com/InteractiveAdvertisingBureau/openrtb/blob/main/supplychainobject.md
 *
 * @param {Object} schain                 The supply chain object.
 * @param {string} schain.ver             The version of the supply chain.
 * @param {number} schain.complete        Indicates if the chain is complete (1) or not (0).
 * @param {Array<Object>} schain.nodes    An array of nodes in the supply chain.
 * @param {Array<string>} nodesProperties The list of node properties to include in the serialized string.
 *                                           Can include: 'asi', 'sid', 'hp', 'rid', 'name', 'domain', 'ext'.
 * @returns {string|null} The serialized supply chain string or null if the nodes are not present.
 */
export function serializeSupplyChain(schain, nodesProperties) {
  if (!schain?.nodes) return null;

  const header = `${schain.ver},${schain.complete}!`;
  const nodes = schain.nodes.map(
    node => nodesProperties.map(
      prop => node[prop] ? encodeURIComponent(node[prop]).replace(/!/g, '%21') : ''
    ).join(',')
  ).join('!');

  return header + nodes;
}
