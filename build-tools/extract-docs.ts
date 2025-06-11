import ts from "typescript";
import fs from "fs";
import { Completion } from "@codemirror/autocomplete";

// Prepare completions
let classCompletions: Completion[] = [];

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
      if (node.name.getText()[0] === "#") return;

      signature = `${className}.${node.name.getText()}(${node.parameters.map(p => p.getText()).join(", ")})`
      autofillSignature = `hui.${node.name.getText()}(${node.parameters.map(p => `\${${p.name.getText()}}`).join(", ")})`
    } else if (ts.isGetAccessorDeclaration(node)) {
      if (node.name.getText()[0] === "#") return;

      signature = `${className}.${node.name.getText()}`
      autofillSignature = `hui.${node.name.getText()}`
    } else if (ts.isPropertyDeclaration(node)) {
      if (node.name.getText()[0] === "#") return;

      signature = `${className}.${node.name.getText()}`
      autofillSignature = `hui.${node.name.getText()}`
    } else {
      return ts.forEachChild(node, visit);
    }

    classCompletions.push({ label: autofillSignature, displayLabel: signature, info: signature });
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
const head = `import { wrapAutocomplete } from "$lib/faux-language-server"
import { type Completion } from "@codemirror/autocomplete"

const huiCompletions: Completion[] = `

const tail = `
export const huiAutocomplete = wrapAutocomplete(/hui\\..*/, huiCompletions); `

for (let name of fs.readdirSync(path + "/")) {
  try {
    visit(loadSourceFile(name, path));
    // classCompletions = {};
  } catch {
    console.log("ignored:", name);
  }
}

classCompletions = [];

fs.writeFileSync(path + "/hui.docs.ts", head + JSON.stringify(classCompletions, null, 2) + tail);
