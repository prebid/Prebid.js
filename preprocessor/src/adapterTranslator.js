const AST = require('abstract-syntax-tree');
const {ImportMapTranslator} = require('./importTranslator.js');

/* only touch files that import and call `registerBidder` */
const TRIGGER = {
  module: 'src/adapters/bidderFactory.js',
  name: 'registerBidder'
}

const REPLACE_IMPORTS = {
  'src/storageManager.js': {'getStorageManager': ['src/adapters/bidderDepFactories.js', 'storageManagerFactory']},
  'src/config.js': {'config': ['src/adapters/bidderDepFactories.js', 'configFactory']}
}

/*
there's only so much processing we can do to evaluate bidder code if we're not re-implementing a javascript VM.
There are a couple of adapters that use hard-to-decipher patterns; for now, that is addressed by adding a comment line
that looks like:
/* #define bidderCode: <code> */

const BIDDER_CODE_OVERRIDE = new RegExp('^\\/\\*\\s*#define bidderCode: (.*?)\\s*\\*\\/$', 'm')

class AdapterTranslator extends ImportMapTranslator {
  constructor(opts) {
    opts = opts || {};
    Object.assign(opts, {
      importMap: REPLACE_IMPORTS
    })
    super(opts);
  }

  shouldTranslate(translation) {
    return this.getRegisterBidderName(translation)
      .then(() => translation.importsToTranslate())
      .then((imp) => imp.length > 0)
      .catch(() => false)
  }

  factoryArguments(translation, factoryModule, factoryName) {
    return this.resolveBidderCode(translation).then((bidderCode) => [new AST.Literal(bidderCode)])
  }

  getRegisterBidderName(translation) {
    return Promise.all([
      translation.resolveImports(),
      this.resolve(this.cwd, TRIGGER.module)
    ]).then(([imports, trigger]) => {
      let match = imports.find((i) => i.filename === trigger)
      if (match != null) {
        match = match.node.specifiers.find((spec) => spec.imported.name === TRIGGER.name)
      }
      if (match == null) {
        return Promise.reject(new Error('Cannot find import for registerBidder'))
      }
      return match.local.name;
    })
  }

  resolveBidderCode(translation) {
    let define = BIDDER_CODE_OVERRIDE.exec(translation.source);
    if (define != null) {
      return Promise.resolve(define[1])
    }
    return this.getRegisterBidderName(translation)
      .then((n) => this.inferBidderCode(translation.tree, n))
  }

  registerBidderCalls(tree, registerName) {
    return tree.find('CallExpression')
      .filter((e) => e.callee.type === 'Identifier' && e.callee.name === registerName)
      .map((cl) => cl.arguments)
      .filter((args) => args.length === 1)
  }

  inferBidderCode(tree, registerName) {
    const resolveIdentifier = (node) => {
      if (node.type !== 'Identifier') {
        return node;
      }
      const declarations = tree.find('VariableDeclarator')
        .filter((decl) => decl.id.name === node.name)
        .map((decl) => decl.init);
      if (declarations.length !== 1) {
        throw new Error('cannot find declaration of spec');
      }
      if (declarations[0].type === 'Identifier') {
        return resolveIdentifier(declarations[0]);
      }
      return declarations[0];
    }
    const resolveMemberExpression = (node) => {
      if (node.type !== 'MemberExpression') {
        return node;
      }
      return getObjectProperty(resolveIdentifier(node.object), node.property.name);
    }
    const getObjectProperty = (node, propertyName) => {
      const prop = node.properties.find((p) => p.key.name === propertyName);
      if (prop == null) {
        throw new Error(`cannot find property ${propertyName} in node ${node}`);
      }
      return prop.value;
    }
    const values = this.registerBidderCalls(tree, registerName)
      .map((args) => args[0])
      .map(resolveIdentifier)
      .filter((node) => node.type === 'ObjectExpression')
      .map((node) => getObjectProperty(node, 'code'))
      .map(resolveMemberExpression)
      .map(resolveIdentifier)
      .map(AST.serialize)
      .filter((n) => n != null);

    if (values.length !== 1) {
      throw new Error('cannot resolve bidder code');
    }

    return values[0];
  }
}

module.exports = {
  AdapterTranslator: AdapterTranslator
}
