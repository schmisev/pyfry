<script lang="ts">
  import { onMount } from "svelte";
  import CodeMirror from "svelte-codemirror-editor";
  import { python } from "@codemirror/lang-python";
  //import { loadPyodide, type PyodideInterface } from "pyodide";

  let codePreamble = `

  `
  let codeString = `# Beispiel
import matplotlib.pyplot as plt
import numpy as np
from io import BytesIO
import base64

x = np.arange(0, 4 * np.pi, 0.1)
y = np.sin(x)

plt.plot(x, y)
buf = BytesIO()
plt.savefig(buf, format='png')
base64.b64encode(buf.getvalue()).decode('utf-8')
  `;
  let consoleOut: HTMLElement;
  let imageOut: HTMLElement;
  let pyodide: any;

  onMount(async () => {
    consoleOut = document.getElementById("console-out")!;
    imageOut = document.getElementById("image-out")!;
    pyodide = await loadPyodide({
      fullStdLib: true,
      stdout: (msg: any) => {
        consoleOut.textContent += `${msg}\n`;
        console.log(`${msg}`);
      },
    });

    await pyodide.loadPackage("numpy");
    await pyodide.loadPackage("matplotlib");
  });

  async function runCode() {
    consoleOut.innerHTML = ""
    let png = await pyodide.runPythonAsync(codeString);
    const img = document.createElement('img');
    img.src = 'data:image/png;base64,' + png;
    imageOut.appendChild(img);
  }
</script>

<div class="layout main">
  <div class="layout panel code">
    <CodeMirror bind:value={codeString} lang={python()}></CodeMirror>
    <button onclick={runCode}>AUSFÜHREN</button>
  </div>

  <div class="layout panel output">
    <div>
      <pre id="console-out">

      </pre>
    </div>
    <div id="image-out">
      
    </div>
  </div>
</div>

<style lang="scss">
  .layout {
    box-sizing: border-box;
    border: 1px black solid;
    border-radius: 0.2em;
    box-shadow: rgba(0, 0, 0, 0.2) 0.1em 0.1em 0.5em;
    padding: 0.5em;
  }

  .layout.main {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5em;
  }

  .layout.panel {
    display: flex;
    flex-flow: column nowrap;
  }

  .layout.panel.left {
    grid-column: 1;
  }

  .layout.panel.right {
    grid-column: 2;
  }
</style>