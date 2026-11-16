import { isArrayOfNums, logWarn } from '../../src/utils.js';
import type { Size } from '../../src/types/common.d.ts';

/**
 * Validates `video.sizeBuckets`, dropping (and warning about) invalid entries.
 * Returns null when there are no valid buckets.
 */
export function normalizeSizeBuckets(sizeBuckets: unknown): Size[] | null {
  if (sizeBuckets == null) {
    return null;
  }
  if (!Array.isArray(sizeBuckets)) {
    logWarn('video.sizeBuckets must be an array of [width, height] sizes; ignoring it', sizeBuckets);
    return null;
  }
  const valid = sizeBuckets.filter((bucket): bucket is Size => {
    const isValid = isArrayOfNums(bucket, 2) && bucket.every(dimension => dimension > 0);
    if (!isValid) {
      logWarn('Ignoring invalid video.sizeBuckets entry; expected [width, height] with positive integers', bucket);
    }
    return isValid;
  });
  return valid.length ? valid : null;
}

/**
 * Returns the bucket with the smallest Euclidean distance to `size`. Ties go to the first bucket in the list.
 */
export function getNearestSizeBucket([width, height]: Size, sizeBuckets: Size[]): Size {
  let nearest: Size = null;
  let nearestDistance = Infinity;
  sizeBuckets.forEach(bucket => {
    const distance = (bucket[0] - width) ** 2 + (bucket[1] - height) ** 2;
    if (distance < nearestDistance) {
      nearest = bucket;
      nearestDistance = distance;
    }
  });
  return nearest && [nearest[0], nearest[1]];
}
