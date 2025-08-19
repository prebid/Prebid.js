import { logInfo } from '../../src/utils.js';

/**
 * Search for Utiq service to be enabled on any other existing frame, then, if found,
 * sends a post message to it requesting the idGraph values atid and mtid(optional).
 *
 * If the response is successful and the Utiq frame origin domain is different,
 * a new utiqPass local storage key is set.
 * @param storage - prebid class to access browser storage
 * @param refreshUserIds - prebid method to synchronize the ids
 * @param logPrefix - prefix to identify the submodule in the logs
 * @param moduleName - name of the module that tiggers the function
 */
export function findUtiqService(storage: any, refreshUserIds: () => void, logPrefix: string, moduleName: string) {
  let frame = window;
  let utiqFrame: Window & typeof globalThis;
  while (frame) {
    try {
      if (frame.frames['__utiqLocator']) {
        utiqFrame = frame;
        break;
      }
    } catch (ignore) { }
    if (frame === window.top) {
      break;
    }
    frame = frame.parent as Window & typeof globalThis;
  }

  logInfo(`${logPrefix}: frame found: `, Boolean(utiqFrame));
  if (utiqFrame) {
    window.addEventListener('message', (event) => {
      const {action, idGraphData, description} = event.data;
      if (action === 'returnIdGraphEntry' && description.moduleName === moduleName) {
        // Use the IDs received from the parent website
        if (event.origin !== window.origin) {
          logInfo(`${logPrefix}: Setting local storage pass: `, idGraphData);
          if (idGraphData) {
            storage.setDataInLocalStorage('utiqPass', JSON.stringify({
              "connectId": {
                "idGraph": [idGraphData],
              },
            }))
          } else {
            logInfo(`${logPrefix}: removing local storage pass`);
            storage.removeDataFromLocalStorage('utiqPass');
          }
          refreshUserIds();
        }
      }
    });
    utiqFrame.postMessage({
      action: 'getIdGraphEntry',
      description: { moduleName },
    }, "*");
  }
}
