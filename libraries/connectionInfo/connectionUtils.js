/**
 * Returns the type of connection.
 *
 * @returns {number} - Type of connection.
 */
export function getConnectionType() {
  const connection = navigator.connection || navigator.webkitConnection;
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
