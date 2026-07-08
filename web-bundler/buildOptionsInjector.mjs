import assert from 'node:assert';
import { parse } from '@babel/parser';
import { generate } from '@babel/generator';
import traverse from '@babel/traverse';
import { types as t } from '@babel/core';

/**
 * take the source code of webpack's `buildOptions.js` chunk;
 * wrap it in an  `export function injectBuildOptions(__buildOptions__) ...`;
 * find the options object declaration (by looking for the known "pbGlobal" key that appears in it )
 * and replace it with `__buildOptions__`.
 */
export function injector(buildOptionsSource) {
  const tree = parse(buildOptionsSource);
  traverse.default(tree, {
    Program(path) {
      assert.equal(path.node.body.length, 1);
      assert.ok(t.isExpressionStatement(path.node.body[0]));
    },
    ExpressionStatement(path) {
      if (t.isProgram(path.parentPath.node)) {
        path.replaceWith(
          t.exportNamedDeclaration(
            t.functionDeclaration(
              t.identifier('injectBuildOptions'),
              [t.identifier('__buildOptions__')],
              t.blockStatement([path.node])
            )
          )
        );
      }
    },
    ObjectProperty(path) {
      if (t.isStringLiteral(path.node.key) && path.node.key.value === 'pbGlobal') {
        assert.ok(t.isObjectExpression(path.parentPath.node));
        path.parentPath.replaceWith(t.identifier('__buildOptions__'));
      }
    }
  });
  return generate(tree).code;
}
