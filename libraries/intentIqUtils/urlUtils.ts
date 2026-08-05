interface PartnerData {
  spd?: string | Record<string, unknown>;
}

export function appendSPData(
  url: string,
  partnerData?: PartnerData
): string {
  const spdParam = partnerData?.spd
    ? encodeURIComponent(
      typeof partnerData.spd === 'object' ? JSON.stringify(partnerData.spd) : partnerData.spd
    )
    : '';

  if (!spdParam) {
    return url;
  }

  return `${url}&spd=${spdParam}`;
}
