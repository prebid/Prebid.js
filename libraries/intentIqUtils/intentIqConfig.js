const REGION_MAPPING = {
  gdpr: true,
  apac: true,
  emea: true
};

function checkRegion(region) {
  if (typeof region !== 'string') return '';
  const lower = region.toLowerCase();
  return REGION_MAPPING[lower] ? lower : '';
}

function buildServerAddress(baseName, region) {
  const checkedRegion = checkRegion(region);
  if (checkedRegion) return `https://${baseName}-${checkedRegion}.intentiq.com`;
  return `https://${baseName}.intentiq.com`;
}

export const getIiqServerAddress = (configParams = {}) => {
  if (typeof configParams?.iiqServerAddress === 'string') return configParams.iiqServerAddress;
  return buildServerAddress('api', configParams.region);
};

export const iiqPixelServerAddress = (configParams = {}) => {
  if (typeof configParams?.iiqPixelServerAddress === 'string') return configParams.iiqPixelServerAddress;
  return buildServerAddress('sync', configParams.region);
};

export const reportingServerAddress = (reportEndpoint, region) => {
  if (reportEndpoint && typeof reportEndpoint === 'string') return reportEndpoint;
  const host = buildServerAddress('reports', region);
  return `${host}/report`;
};
