import ts from "typescript";
import fs from "fs";
import { NodeDoc, NodeAccess, NodeType } from "../src/lib/game/hui";

// Prepare completions
let classCompletions: Record<string, NodeDoc[]> = {};

// Helper function to extract JSDoc comments
function extractJSDoc(node: ts.Node) {
  const jsDocs = (node as any).jsDoc as ts.JSDoc[] | undefined;
  let comment = "";
  if (jsDocs) {
    for (const doc of jsDocs) {
      comment += doc.comment || "";
      if (doc.tags) {
        doc.tags.forEach(tag => {
          comment += `<br>@${tag.tagName.text}: ${tag.comment}`
        });
      }
    }
  }
  return comment;
}

// Traverse AST and find functions
function visit(node: ts.Node) {
  if (ts.isClassDeclaration(node)) {
    let className: string = node.name!.getText();
    let signature: string = className;
    let type: NodeType = "class";
    let access: NodeAccess = "public";
    let return_type: string = "";
    let jsDoc: string = extractJSDoc(node);

    !(className in classCompletions) && (classCompletions[className] = []);

    classCompletions[className].push({
      className,
      signature, 
      jsDoc,
      type,
      access,
      return_type
    });
  } else if (node.parent && ts.isClassDeclaration(node.parent)) {
    // we are in a class
    let className: string = node.parent.name!.getText();
    let signature: string = "???";
    let type: NodeType = "method";
    let access: NodeAccess = "public";
    let return_type: string = "";

    if (ts.isMethodDeclaration(node)) {
      signature = `${node.name.getText()}(${node.parameters.map(p => p.getText()).join(", ")})`
      type = "method";
      return_type = node.type ? node.type.getFullText() : "";
    } else if (ts.isPropertyDeclaration(node)) {
      signature = `${node.name.getText()}`
      type = "attribute";
      return_type = node.type ? node.type.getFullText() : "";
    } else if (ts.isGetAccessorDeclaration(node)) {
      signature = `${node.name.getText()}`
      type = "get";
      return_type = node.type ? node.type.getFullText() : "";
    } else if (ts.isSetAccessor(node)) {
      signature = `${node.name.getText()}`
      type = "set";
      return_type = node.type ? node.type.getFullText() : "";
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
      access,
      return_type,
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
