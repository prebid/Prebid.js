/**
 * Returns the type of connection.
 *
 * @returns {int} - Type of connection.
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
      case 'cellular':
        switch (connection.effectiveType) {
          case 'slow-2g':
          case '2g':
            return 4;
          case '3g':
            return 5;
          case '4g':
            return 6;
          default:
            return 3;
        }
      default:
        return 0;
    }
  }