import ts from "typescript";
import fs from "fs";
import { Completion } from "@codemirror/autocomplete";

// Prepare completions
let classCompletions: Record<string, Completion[]> = {};

// Helper function to extract JSDoc comments
function extractJSDoc(node: ts.Node) {
  const jsDocs = (node as any).jsDoc as ts.JSDoc[] | undefined;
  if (jsDocs) {
    for (const doc of jsDocs) {
      console.log("Comment:", doc.comment);
      if (doc.tags) {
        doc.tags.forEach(tag => {
          console.log(`@${tag.tagName.text}`, tag.comment);
        });
      }
    }
  }
}

// Traverse AST and find functions
function visit(node: ts.Node) {

  if (node.parent && ts.isClassDeclaration(node.parent) && node.parent.name) {
    const className = node.parent.name.getText();
    let signature = "???";
    let autofillSignature = "???";
    
    if (ts.isMethodDeclaration(node) && node.name) {
      signature = `${className}.${node.name.getText()}(${node.parameters.map(p => p.getText()).join(", ")})`
      autofillSignature = `${node.name.getText()}(${node.parameters.map(p => `\${${p.name.getText()}}`).join(", ")})`
    } else if (ts.isGetAccessorDeclaration(node)) {
      signature = `${className}.${node.name.getText()}`
      autofillSignature = `${node.name.getText()}`
    } else if (ts.isPropertyDeclaration(node)) {
      signature = `${className}.${node.name.getText()}`
      autofillSignature = `${node.name.getText()}`
    } else {
      return ts.forEachChild(node, visit);
    }

    if (!(className in classCompletions)) {
      classCompletions[className] = [];
    }
    classCompletions[className].push({ label: autofillSignature, displayLabel: signature, info: signature });
  }

  ts.forEachChild(node, visit);
}

function loadSourceFile(name: string, path: string) {
  const sourceFile = ts.createSourceFile(
    name,
    fs.readFileSync(path + "/" + name, "utf-8"),
    ts.ScriptTarget.Latest,
    true
  );
  return sourceFile;
}

// Start traversal
const path = "src/lib/game";
for (let name of ["hui.ts", "hui.vectors.ts"]) {
  visit(loadSourceFile(name, path));
  fs.writeFileSync(path + "/" + name + ".docs.json", JSON.stringify(classCompletions, null, 2));
  classCompletions = {};
}
