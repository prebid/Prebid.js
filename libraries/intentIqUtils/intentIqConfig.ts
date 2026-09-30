const REGION_MAPPING: Record<string, true> = {
  gdpr: true,
  apac: true,
  emea: true
};

interface ServerConfig {
  iiqServerAddress?: string;
  iiqPixelServerAddress?: string;
  region?: string;
}

function checkRegion(region?: string): string {
  if (typeof region !== 'string') return '';
  const lower = region.toLowerCase();
  return REGION_MAPPING[lower] ? lower : '';
}

function buildServerAddress(baseName: string, region?: string): string {
  const checkedRegion = checkRegion(region);

  if (checkedRegion) {
    return `https://${baseName}-${checkedRegion}.intentiq.com`;
  }

  return `https://${baseName}.intentiq.com`;
}

export const getIiqServerAddress = (
  configParams: ServerConfig = {}
): string => {
  if (typeof configParams?.iiqServerAddress === 'string') {
    return configParams.iiqServerAddress;
  }

  return buildServerAddress('api', configParams?.region);
};

export const iiqPixelServerAddress = (
  configParams: ServerConfig = {}
): string => {
  if (typeof configParams?.iiqPixelServerAddress === 'string') {
    return configParams.iiqPixelServerAddress;
  }

  return buildServerAddress('sync', configParams?.region);
};

export const reportingServerAddress = (
  reportEndpoint?: string,
  region?: string
): string => {
  if (reportEndpoint && typeof reportEndpoint === 'string') {
    return reportEndpoint;
  }

  const host = buildServerAddress('reports', region);
  return `${host}/report`;
};
