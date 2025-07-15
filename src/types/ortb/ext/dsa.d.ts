// https://github.com/InteractiveAdvertisingBureau/openrtb/blob/main/extensions/community_extensions/dsa_transparency.md

export type DSATransparency = Partial<{
  /**
   * Domain of the entity that applied user parameters
   */
  domain: string;
  /**
   * Array for platform or sell-side use of any user parameters (using the list provided by DSA Transparency Taskforce).
   */
  dsaparams: number[];
}>;

export type DSARequest = Partial<{
  /**
   * 0 = Not required
   * 1 = Supported, bid responses with or without DSA object will be accepted
   * 2 = Required, bid responses without DSA object will not be accepted
   * 3 = Required, bid responses without DSA object will not be accepted, Publisher is an Online Platform
   */
  dsarequired: 0 | 1 | 2 | 3;
  /**
   * 0 = Publisher can't render
   * 1 = Publisher could render depending on adrender
   * 2 = Publisher will render
   */
  pubrender: 0 | 1 | 2;
  /**
   * 0 = do not send transparency data
   * 1 = optional to send transparency data
   * 2 = send transparency data
   */
  datatopub: 0 | 1 | 2;
  /**
   * Array of objects of the entities that applied user parameters and the parameters they applied.
   */
  transparency: DSATransparency[];
}>;

export type DSAResponse = Partial<{
  /**
   * Advertiser Transparency: Free UNICODE text string with a name of whose behalf the ad is displayed. Maximum 100 characters.
   */
  behalf: string;
  /**
   * Advertiser Transparency: Free UNICODE text string of who paid for the ad.
   * Must always be included even if it's the same as what is listed in the behalf attribute.
   * Maximum 100 characters
   */
  paid: string;
  /**
   * Array of objects of the entities that applied user parameters and the parameters they applied.
   */
  transparency: DSATransparency[];
  /**
   * 0 = buyer/advertiser will not render
   * 1 = buyer/advertiser will render
   */
  adrender: 0 | 1;
}>
