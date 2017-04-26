/**
 * @license
 * Toposort - Topological sorting for node.js
 * Copyright (c) 2012 by Marcel Klehr <mklehr@gmx.net>, 2017 @snapwich
 * MIT LICENSE
 */

export function CyclicDependency(node) {
  this.name = 'CylclicDependency';
  this.module = node;
  this.stack = (new Error()).stack;
}
CyclicDependency.prototype = new Error();

export function UnknownDependency(node) {
  this.name = 'UnknownDependency';
  this.module = node;
  this.stack = (new Error()).stack;
}
UnknownDependency.prototype = new Error();

export function resolve(nodes, edges) {
  var cursor = nodes.length,
      sorted = new Array(cursor),
      visited = {},
      i = cursor;

  while (i--) {
    if (!visited[i]) {
      visit(nodes[i], i, []);
    }
  }

  return sorted.reverse();

  function visit(node, i, predecessors) {
    if(predecessors.indexOf(node) >= 0) {
      throw new CyclicDependency(node);
    }

    if (!~nodes.indexOf(node)) {
      throw new UnknownDependency(node);
    }

    if (visited[i]) {
      return;
    }
    visited[i] = true;

    // outgoing edges
    var outgoing = edges.filter(function(edge){
      return edge[0] === node;
    });
    i = outgoing.length;
    if (i) {
      let preds = predecessors.concat(node);
      do {
        let child = outgoing[--i][1];
        visit(child, nodes.indexOf(child), preds);
      } while (i);
    }

    sorted[--cursor] = node;
  }
}
