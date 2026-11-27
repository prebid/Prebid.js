// the augmentation in this file only applies where the spec is part of the program
import type {} from './userId/spec.js';

interface ConnectIdBaseParams {
  /**
   * SHA-256 hash of the lowercased user email address.
   */
  he?: string;
  /**
   * Domain-specific user identifier, such as a first-party cookie. Auto-generated and stored when omitted.
   */
  puid?: string;
  /**
   * When `1`, `'1'` or `true`, the request is flagged as first-party (`1p=1`).
   */
  '1p'?: boolean | 0 | 1 | '0' | '1';
}

interface ConnectIdPixelParams extends ConnectIdBaseParams {
  /**
   * Yahoo-supplied publisher-specific pixel ID.
   */
  pixelId: number | string;
  /**
   * Overrides the ID endpoint URL.
   */
  endpoint?: string;
}

interface ConnectIdEndpointParams extends ConnectIdBaseParams {
  /**
   * Yahoo-supplied publisher-specific pixel ID.
   */
  pixelId?: number | string;
  /**
   * ID endpoint URL. Required when `pixelId` is not provided.
   */
  endpoint: string;
}

/**
 * Yahoo ConnectID parameters. Either `pixelId` or `endpoint` is required.
 */
export type ConnectIdParams = ConnectIdPixelParams | ConnectIdEndpointParams;

declare module './userId/spec' {
  interface ProviderParams {
    connectId: ConnectIdParams;
  }
}
