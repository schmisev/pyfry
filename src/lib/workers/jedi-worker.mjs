import { loadPyodide, version as pyodideVersion } from "pyodide";
import { numpyAutocompletePreamble } from "../python/presets";

let rejectMessages = true;

let stdOut = (msg) => {
  self.postMessage({
    message: msg,
  });
};

let pyodideReadyPromise = loadPyodide({
  indexURL: `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full/`,
  fullStdLib: true,
  packages: ["jedi", "numpy", "matplotlib"],
  stdout: stdOut,
}).then((pyodide) => {
  pyodide.runPythonAsync(`
import sys
sys.setrecursionlimit(3000)
import jedi
from jedi import settings
import json

print("Jedi-Autocomplete ist online!")
`);
  return pyodide;
}).then((pyodide) => {
  rejectMessages = false;
  return pyodide;
});

self.onmessage = async (event) => {
  if (rejectMessages) {
    console.log("Rejected message!");
    return;
  } else {
    console.log("Accepted message!");
  }
  const pyodide = await pyodideReadyPromise;

  const { source, position } = event.data;
  const { line, column } = position;
  const extendedSource = `${numpyAutocompletePreamble}${source}`;

  try {
    const [completions, signatures] = await pyodide.runPythonAsync(`
script = jedi.Script(code = ${JSON.stringify(extendedSource)})

completions = []
completion_count = 0

for comp in script.complete(line=${line + 3}, column=${column - 1}):
    completion_count += 1    
    #if completion_count > 10:
    #    break

    if comp.name[0] == "_":
        continue

    completions.append((
        comp.name, 
        comp.name,
        "", 
        comp.get_completion_prefix_length(),
        comp.type if comp.type != "statement" else "constant",
    ))

signatures = []

for sig in script.get_signatures(line=${line + 3}, column=${column - 1}):
    signatures.append({
        "name": sig.name,
        "params": [p.name for p in sig.params],
        "index": sig.index,
    })


(json.dumps(completions), json.dumps(signatures))
`);
    console.log(completions, signatures);
    self.postMessage({
      completions: completions,
      signatures: signatures,
    });
  } catch (e) {
    console.log(e);
    self.postMessage({
      completions: JSON.stringify([]),
      signatures: JSON.stringify([]),
    });
  }
};
