import ts from "typescript";
import fs from "fs";

type NodeType = "method" | "set" | "get" | "attribute";
type NodeAccess = "private" | "hidden" | "public";

// Prepare completions
let classCompletions: Record<string, {
  className: string,
  signature: string,
  jsDoc: string,
  type: NodeType,
  access: NodeAccess,
}[]> = {};

// Helper function to extract JSDoc comments
function extractJSDoc(node: ts.Node) {
  const jsDocs = (node as any).jsDoc as ts.JSDoc[] | undefined;
  let comment = "";
  if (jsDocs) {
    for (const doc of jsDocs) {
      comment += doc.comment || "";
      if (doc.tags) {
        doc.tags.forEach(tag => {
          comment += `\n@${tag.tagName.text}: ${tag.comment}`
        });
      }
    }
  }
  return comment;
}

// Traverse AST and find functions
function visit(node: ts.Node) {

  if (node.parent && ts.isClassDeclaration(node.parent)) {
    // we are in a class
    let className: string = node.parent.name!.getText();
    let signature: string = "???";
    let type: NodeType = "method";
    let access: NodeAccess = "public";

    if (ts.isMethodDeclaration(node)) {
      signature = `${node.name.getText()}(${node.parameters.map(p => p.getText()).join(", ")})`
      type = "method";
    } else if (ts.isPropertyDeclaration(node)) {
      signature = `${node.name.getText()}`
      type = "attribute";
    } else if (ts.isGetAccessorDeclaration(node)) {
      signature = `${node.name.getText()}`
      type = "get";
    } else if (ts.isSetAccessor(node)) {
      signature = `${node.name.getText()}`
      type = "set";
    } else {
      ts.forEachChild(node, visit);
      return;
    }

    if (node.name.getText()[0] === "#") access = "private"
    else if (node.name.getText()[0] == "_" && node.name.getText()[1] == "_") access = "hidden"

    let jsDoc = extractJSDoc(node);

    !(className in classCompletions) && (classCompletions[className] = []);

    classCompletions[className].push({
      className,
      signature, 
      jsDoc,
      type,
      access
    });
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

for (let name of fs.readdirSync(path + "/")) {
  try {
    visit(loadSourceFile(name, path));
    // classCompletions = {};
  } catch {
    console.log("ignored:", name);
  }
}

// classCompletions = [];

fs.writeFileSync(path + "/hui.docs.json", JSON.stringify(classCompletions, null, 2));
