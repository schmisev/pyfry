import { loadPyodide, version as pyodideVersion } from "pyodide";
import { numpyAutocompletePreamble } from "../python/presets";

let interruptBuffer = new Uint8Array(new ArrayBuffer(1));
function interruptExecution() {
  interruptBuffer[0] = 2; // SIGINT
}

function resetInterrupt() {
  interruptBuffer[0] = 0;
}

let lastId: number = -1;

let stdOut = (msg: string) => {
  self.postMessage({
    message: msg,
  });
};

let pyodideReadyPromise = loadPyodide({
  indexURL: `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full/`,
  fullStdLib: true,
  packages: ["jedi", "numpy", "matplotlib"],
  stdout: stdOut,
}).then(async (pyodide) => {
  await pyodide.runPythonAsync(`
import sys
sys.setrecursionlimit(3000)
import jedi
from jedi import settings
import json

jedi.settings.auto_import_modules = ['gi', 'numpy', 'matplotlib']
`);
  return pyodide;
}).then((pyodide) => {
  sendCompletionMessage(-1);
  pyodide.setInterruptBuffer(interruptBuffer);
  return pyodide;
});

self.onmessage = async (event) => {
  const { id, source, position, skipCompletions } = event.data;
  const { cursor, line, column } = position;
  const extendedSource = `${numpyAutocompletePreamble}${source}`;

  if (id < lastId) return;
  interruptExecution();
  
  const pyodide = await pyodideReadyPromise;

  try {
    resetInterrupt();
    const [completions, signatures] = await pyodide.runPythonAsync(`
code = ${JSON.stringify(extendedSource)}
script = jedi.Script(code)

#namespace = locals()
#interp = jedi.Interpreter(code, [namespace])

completions = []
completion_count = 0

if ${!!skipCompletions ? 'False' : 'True'}:
    # only try a full completion if requested
    for comp in script.complete(line=${line + 3}, column=${column - 1}):
        completion_count += 1    
        #if completion_count > 10:
        #    break

        offset = comp.get_completion_prefix_length()
        if comp.complete[0] == "_" and comp.name[0] == "_":
            continue

        # split up docstring
        docstr = comp.docstring(raw=True, fast=True)
        head = docstr[0:docstr.find("\\n")]

        sig = comp.name

        if comp.type == 'instance':
            sig = head
        elif comp.type == 'function':
            comp_signatures = comp.get_signatures()
            if len(comp_signatures) > 0:
                sig = comp_signatures[0].to_string()

        # filter out classes
        if comp.type == 'class':
          continue

        completions.append((
            comp.name, 
            sig,
            head, 
            offset,
            comp.type,
        ))

signatures = []

for sig in script.get_signatures(line=${line + 3}, column=${column - 1}):
    signatures.append({
        "name": sig.name,
        "params": [(p.name, p.to_string()) for p in sig.params if p.name != "*" and p.name != "/"],
        "index": sig.index,
        "doc": sig.docstring(raw = True)
    })

(json.dumps(completions), json.dumps(signatures))
`);
    sendCompletionMessage(id, completions, signatures)
  } catch (e) {
    try {
      pyodide.checkInterrupt()
    } catch (e) {
      console.log(`Request ${id} has been cancelled!`);
    }
    console.log(`Request ${id} has been cancelled!`);
    sendCompletionMessage(id);
  }
};

function sendCompletionMessage(id: number, completions = "[]", signatures = "[]") {
  self.postMessage({
    id,
    completions,
    signatures
  })
}