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
  storage?: {
    type: 'cookie' | 'html5';
    name: string;
    expires?: number;
    refreshInSeconds?: number;
  };
}

export {};
