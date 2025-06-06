import { loadPyodide, version as pyodideVersion } from "pyodide";

let stdOut = (msg) => {
    self.postMessage({
        message: msg,
    })
};

let pyodideReadyPromise = loadPyodide({
    indexURL: `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full/`,
    fullStdLib: true,
    packages: ["numpy", "matplotlib"],
    stdout: stdOut
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
            result: ret ? ret.toJs() : 0,
            pngList: imgStr.toJs(),
        });
    } catch (error) {
        let correctedMessage = error.message.slice(error.message.search(`File "<exec>"`));
        let lineNumberStr = correctedMessage.match(/line [0-9]+\n/)[0];
        let lineNumber = parseInt(lineNumberStr.slice(5, lineNumberStr.length - 1));
        correctedMessage = correctedMessage.replace(`File "<exec>", line ${lineNumber}`, `Fehler in Zeile ${lineNumber - scriptPackage.offset}:`)
        self.postMessage({
            error: correctedMessage,
            lineNumber
        })
    }
}