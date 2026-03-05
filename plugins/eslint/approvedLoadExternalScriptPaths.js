// List of exact file paths or folder paths where loadExternalScript is allowed to be used.
// Folder paths (without file extension) allow all files in that folder.
const APPROVED_LOAD_EXTERNAL_SCRIPT_PATHS = [
  // Prebid maintained modules:
  'src/debugging.js',
  'src/Renderer.js',
  // RTD modules:
  'modules/aaxBlockmeterRtdProvider.js',
  'modules/adagioRtdProvider.js',
  'modules/adlooxAnalyticsAdapter.js',
  'modules/arcspanRtdProvider.js',
  'modules/airgridRtdProvider.js',
  'modules/browsiRtdProvider.js',
  'modules/brandmetricsRtdProvider.js',
  'modules/cleanioRtdProvider.js',
  'modules/humansecurityMalvDefenseRtdProvider.js',
  'modules/humansecurityRtdProvider.ts',
  'modules/confiantRtdProvider.js',
  'modules/contxtfulRtdProvider.js',
  'modules/hadronRtdProvider.js',
  'modules/mediafilterRtdProvider.js',
  'modules/medianetRtdProvider.js',
  'modules/azerionedgeRtdProvider.js',
  'modules/a1MediaRtdProvider.js',
  'modules/geoedgeRtdProvider.js',
  'modules/qortexRtdProvider.js',
  'modules/dynamicAdBoostRtdProvider.js',
  'modules/51DegreesRtdProvider.js',
  'modules/symitriDapRtdProvider.js',
  'modules/wurflRtdProvider.js',
  'modules/nodalsAiRtdProvider.js',
  'modules/anonymisedRtdProvider.js',
  'modules/optableRtdProvider.js',
  'modules/oftmediaRtdProvider.js',
  'modules/panxoRtdProvider.js',
  // UserId Submodules
  'modules/justIdSystem.js',
  'modules/tncIdSystem.js',
  'modules/ftrackIdSystem.js',
  'modules/id5IdSystem.js',
  // Test files
  '**/*spec.js',
  '**/*spec.ts',
  '**/test/**/*',
];

module.exports = APPROVED_LOAD_EXTERNAL_SCRIPT_PATHS;

