import fs from 'fs';

const DECLARATION_PAT = /^(.*)\.d\.ts$/;

export function checkDeclarationFilename(context, node) {
  const decl = DECLARATION_PAT.exec(context.getFilename());

  if (decl != null) {
    const jsFile = `${decl[1]}.js`;
    const tsFile = `${decl[1]}.ts`;
    if (!fs.existsSync(jsFile)) {
      context.report(node, `Declaration file does not have a corresponding .js file`);
    }
    if (fs.existsSync(tsFile)) {
      context.report(node, `Declaration file has the same name as a .ts file`)
    }
  }
}
