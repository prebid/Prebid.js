export function hydratePayloadWithGPPData(payload, gppData) {
  if (gppData) {
    let isValidConsentString = typeof gppData.gppString === 'string';
    let validateApplicableSections =
            Array.isArray(gppData.applicableSections) &&
            gppData.applicableSections.every((section) => typeof (section) === 'number')
    payload.gpp = {
      consentString: isValidConsentString ? gppData.gppString : '',
      applicableSectionIds: validateApplicableSections ? gppData.applicableSections : [],
    };
  }
  return payload;
}

export function hydratePayloadWithGDPRData(payload, gdprData) {
  if (gdprData) {
    let isCmp = typeof gdprData.gdprApplies === 'boolean';
    let isConsentString = typeof gdprData.consentString === 'string';
    let status = isCmp
      ? findGdprStatus(gdprData.gdprApplies, gdprData.vendorData)
      : gdprStatus.CMP_NOT_FOUND_OR_ERROR;
    payload.gdpr_iab = {
      consent: isConsentString ? gdprData.consentString : '',
      status: status,
      apiVersion: gdprData.apiVersion
    };
  }
}

export function hydratePayloadWithUspConsentData(payload, uspConsentData) {
  if (uspConsentData) {
    payload.us_privacy = uspConsentData;
  }
}

const gdprStatus = {
  GDPR_APPLIES_PUBLISHER: 12,
  GDPR_APPLIES_GLOBAL: 11,
  GDPR_DOESNT_APPLY: 0,
  CMP_NOT_FOUND_OR_ERROR: 22
};

function findGdprStatus(gdprApplies, gdprData) {
  let status = gdprStatus.GDPR_APPLIES_PUBLISHER;
  if (gdprApplies) {
    if (gdprData && !gdprData.isServiceSpecific) {
      status = gdprStatus.GDPR_APPLIES_GLOBAL;
    }
  } else {
    status = gdprStatus.GDPR_DOESNT_APPLY;
  }
  return status;
}
