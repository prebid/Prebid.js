export function makeEmptyCH() {
  const empty = {};
  CH_KEYS.forEach(key => {
    if (key === 'brands' || key === 'fullVersionList') {
      empty[key] = [];
    } else if (key === 'mobile' || key === 'wow64') {
      empty[key] = false;
    } else {
      empty[key] = '';
    }
  });
  return empty;
}