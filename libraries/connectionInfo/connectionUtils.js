/**
 * Returns the type of connection.
 *
 * @returns {number} - Type of connection.
 */
function resolveNavigator() {
  if (typeof window !== 'undefined' && window.navigator) {
    return window.navigator;
  }

  if (typeof navigator !== 'undefined') {
    return navigator;
  }

  return null;
}

function resolveNetworkInformation() {
  const nav = resolveNavigator();
  if (!nav) {
    return null;
  }

  return nav.connection || nav.mozConnection || nav.webkitConnection || null;
}

export function getConnectionInfo() {
  const connection = resolveNetworkInformation();

  if (!connection) {
    return null;
  }

  return {
    type: connection.type ?? null,
    effectiveType: connection.effectiveType ?? null,
    downlink: typeof connection.downlink === 'number' ? connection.downlink : null,
    downlinkMax: typeof connection.downlinkMax === 'number' ? connection.downlinkMax : null,
    rtt: typeof connection.rtt === 'number' ? connection.rtt : null,
    saveData: typeof connection.saveData === 'boolean' ? connection.saveData : null,
    bandwidth: typeof connection.bandwidth === 'number' ? connection.bandwidth : null
  };
}

export function getConnectionType() {
  const connection = getConnectionInfo();
  if (!connection) {
    return 0;
  }

  switch (connection.type) {
    case 'ethernet':
      return 1;
    case 'wifi':
      return 2;
    case 'wimax':
      return 6;
    default:
      switch (connection.effectiveType) {
        case 'slow-2g':
        case '2g':
          return 4;
        case '3g':
          return 5;
        case '4g':
          return 6;
        case '5g':
          return 7;
        default:
          return connection.type === 'cellular' ? 3 : 0;
      }
  }
}
