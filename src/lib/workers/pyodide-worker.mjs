import { loadPyodide, version as pyodideVersion } from "pyodide";
import { correctPyodideErrorMessage } from "../python/pyodide.utils";

let stdOut = (msg) => {
    self.postMessage({
        message: msg,
    })
};

let pyodideReadyPromise = loadPyodide({
    indexURL: `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full/`,
    fullStdLib: true,
    packages: ["numpy", "matplotlib"],
    stdout: stdOut,
});

self.onmessage = async (event) => {
    const pyodide = await pyodideReadyPromise;
    const { scriptPackage, context } = JSON.parse(event.data);
    const csv_data = context["csv_data"];
    let empty_namespace = pyodide.globals.get("dict")();
    empty_namespace.set("csv_data", csv_data);
    
    try {
        // pyodide.globals.set("csv_data", csv_data);
        const ret = await pyodide.runPythonAsync(scriptPackage.script, {globals: empty_namespace});
        const imgStr = empty_namespace.get("plot_result");
        const retStr = ret ? pyodide.globals.get("str")(ret) : '';

        self.postMessage({ 
            result: retStr,
            pngList: imgStr.toJs(),
        });
    } catch (error) {
        let { correctedMessage, lineNumber } = correctPyodideErrorMessage(error, scriptPackage);
        self.postMessage({
            error: correctedMessage,
            lineNumber
        })
    }
}