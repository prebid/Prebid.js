export interface AbtshieldIdParams {
  /** Required. Service ID obtained from abtshield.com (e.g. `pb.publisher-x`). */
  sid: string;
}

export interface AbtshieldIdValue {
  uuid: string;
  segments?: string[];
}

export interface AbtshieldIdConfig {
  name: 'abtshieldId';
  params: AbtshieldIdParams;
  storage: {
    type: 'cookie' | 'html5';
    name: string;
    /** TTL in days. Must be >= 1; the module rejects shorter TTLs to bound MCR request volume. */
    expires: number;
    /** Refresh interval in seconds. If set, must be >= 86400. */
    refreshInSeconds?: number;
  };
}

export {};
