import {bundleMaker} from './bundle/common.mjs';
import {getWebpackBundle} from './bundle/webpack.mjs';
import process from 'process';
import {getNpmBundle} from './bundle/npm.mjs';

const makeBundle = bundleMaker(process.env.NPM ? getNpmBundle : getWebpackBundle);

export function bundle(req, res, next) {
  res.type('text/javascript');
  makeBundle(req.query.modules).then((source) => {
    res.send(source);
  }).catch(next);
}
