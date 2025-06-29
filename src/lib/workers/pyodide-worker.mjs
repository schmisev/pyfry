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
    try {
        pyodide.globals.set("csv_data", csv_data);
        const ret = await pyodide.runPythonAsync(scriptPackage.script);
        const imgStr = pyodide.globals.get("plot_result");

        self.postMessage({ 
            result: 0,
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