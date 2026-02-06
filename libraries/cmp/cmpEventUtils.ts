/**
 * Shared utilities for CMP event listener management
 * Used by TCF and GPP consent management modules
 */

import { logError, logInfo } from "../../src/utils.js";

export interface CmpEventManager {
  cmpApi: any;
  listenerId: number | undefined;
  setCmpApi(cmpApi: any): void;
  getCmpApi(): any;
  setCmpListenerId(listenerId: number | undefined): void;
  getCmpListenerId(): number | undefined;
  removeCmpEventListener(): void;
  resetCmpApis(): void;
}

/**
 * Base CMP event manager implementation
 */
export abstract class BaseCmpEventManager implements CmpEventManager {
  cmpApi: any = null;
  listenerId: number | undefined = undefined;

  setCmpApi(cmpApi: any): void {
    this.cmpApi = cmpApi;
  }

  getCmpApi(): any {
    return this.cmpApi;
  }

  setCmpListenerId(listenerId: number | undefined): void {
    this.listenerId = listenerId;
  }

  getCmpListenerId(): number | undefined {
    return this.listenerId;
  }

  resetCmpApis(): void {
    this.cmpApi = null;
    this.listenerId = undefined;
  }

  /**
   * Helper method to get base removal parameters
   * Can be used by subclasses that need to remove event listeners
   */
  protected getRemoveListenerParams(): Record<string, any> | null {
    const cmpApi = this.getCmpApi();
    const listenerId = this.getCmpListenerId();

    // Comprehensive validation for all possible failure scenarios
    if (cmpApi && typeof cmpApi === 'function' && listenerId !== undefined && listenerId !== null) {
      return {
        command: "removeEventListener",
        callback: () => this.resetCmpApis(),
        parameter: listenerId
      };
    }
    return null;
  }

  /**
   * Abstract method - each subclass implements its own removal logic
   */
  abstract removeCmpEventListener(): void;
}

/**
 * TCF-specific CMP event manager
 */
export class TcfCmpEventManager extends BaseCmpEventManager {
  private getConsentData: () => any;

  constructor(getConsentData?: () => any) {
    super();
    this.getConsentData = getConsentData || (() => null);
  }

  removeCmpEventListener(): void {
    const params = this.getRemoveListenerParams();
    if (params) {
      const consentData = this.getConsentData();
      params.apiVersion = consentData?.apiVersion || 2;
      logInfo('Removing TCF CMP event listener');
      this.getCmpApi()(params);
    }
  }
}

/**
 * GPP-specific CMP event manager
 * GPP doesn't require event listener removal, so this is empty
 */
export class GppCmpEventManager extends BaseCmpEventManager {
  removeCmpEventListener(): void {
    const params = this.getRemoveListenerParams();
    if (params) {
      logInfo('Removing GPP CMP event listener');
      this.getCmpApi()(params);
    }
  }
}

/**
 * Factory function to create appropriate CMP event manager
 */
export function createCmpEventManager(type: 'tcf' | 'gpp', getConsentData?: () => any): CmpEventManager {
  switch (type) {
    case 'tcf':
      return new TcfCmpEventManager(getConsentData);
    case 'gpp':
      return new GppCmpEventManager();
    default:
      logError(`Unknown CMP type: ${type}`);
      return null;
  }
}
