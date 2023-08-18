import {parseSizesInput} from '../../../src/utils.js';

export function sizesToFormat(sizes) {
  sizes = parseSizesInput(sizes);

  // get sizes in form [{ w: <int>, h: <int> }, ...]
  return sizes.map(size => {
    const [width, height] = size.split('x');
    return {
      w: parseInt(width, 10),
      h: parseInt(height, 10)
    };
  });
}
