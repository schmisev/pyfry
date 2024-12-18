<script lang="ts">
  import { ALL_PRESETS, type CodePreset } from "$lib/presets";
  import { onMount } from "svelte";
  import CodeMirror from "svelte-codemirror-editor";
  import { python } from "@codemirror/lang-python";
  import { page } from "$app/state";
  import { downloadPreset } from "$lib/preset-loading";
  //import { compress, decompress } from "shrink-string";
  //import { loadPyodide, type PyodideInterface } from "pyodide";
  import LZString from "lz-string";
  let btoa2 = (v: string) => btoa(v);
  let atob2 = (v: string) => atob(v);

  let flags = $state({
    isRunning: false,
  });

  let preset: CodePreset = $state(ALL_PRESETS[0]); // get first preset
  loadURLParams(); // fetch from URL

  function loadURLParams() {
    //let _name = page.url.searchParams.get("name");
    let _code = page.url.searchParams.get("code");
    let _preamble = page.url.searchParams.get("preamble");
    let _pseudo = page.url.searchParams.get("pseudo");

    //if (_name) preset.name = atob2(_name)
    if (_code) preset.code = atob2(_code);
    if (_preamble) preset.preamble = atob2(_preamble);
    if (_pseudo) preset.pseudo = atob2(_pseudo);
  }
  function updateURL() {
    let query = new URLSearchParams("");
    //query.set('name', btoa2(preset.name));
    query.set('code', btoa2(preset.code));
    query.set('preamble', btoa2(preset.preamble));
    query.set('pseudo', btoa2(preset.pseudo));
    // goto(`?${query.toString()}`);
    window.history.replaceState(history.state, '', `?${query.toString()}`);
  }

  $effect(
    updateURL
  );

  let consoleOut: HTMLElement;
  let imageOut: HTMLElement;
  let pyodide: any;
  let editor: CodeMirror;

  onMount(async () => {
    consoleOut = document.getElementById("console-out")!;
    imageOut = document.getElementById("image-out")!;

    let old_log = console.log;
    function log(msg: any) {
      consoleOut.textContent += `${msg}\n`;
      old_log(`${msg}`);
    }
    console.log = log;

    pyodide = await loadPyodide({
      fullStdLib: true,
      stdout: log,
    });

    await pyodide.loadPackage("numpy");
    await pyodide.loadPackage("matplotlib");
  });

  async function runCode() {
    if (flags.isRunning) return;
    consoleOut.innerHTML = ""
    flags.isRunning = true;
    let png;
    try {
      png = await pyodide.runPythonAsync(preset.preamble + "\n" + preset.code);
    } catch (e) {
      console.log(e);
    }
    flags.isRunning = false;

    if (!png) return;

    const img = document.createElement('img');
    img.style.width = "100%";
    img.src = 'data:image/png;base64,' + png;
    imageOut.prepend(img);
    while (imageOut.children.length > 10) {
      imageOut.lastChild?.remove();
    }
  }
</script>

<div class="layout main">
  <div class="layout panel code">
    <div class="holder left">
      <div id="title" class="layout panel"><span><b>🍳 PyFryHam</b> by sms</span></div>
      <select id="preset-select" bind:value={preset}>
        {#each ALL_PRESETS.entries() as [i, p]}
          <option value={p}>{p.name}</option>
        {/each}
      </select>
    </div>
    <div class="holder">
      <button onclick={() => downloadPreset(preset)}>download</button>
      <button disabled>upload</button>
      <button onclick={runCode}>{flags.isRunning ? "⌛" : "Go!"}</button>
    </div>

    <div id="editor-wrapper">
      <CodeMirror readonly={true} bind:value={preset.pseudo} lang={python()}></CodeMirror>
      <div class="layout panel divider"></div>
      <CodeMirror bind:value={preset.code} lang={python()}></CodeMirror>
    </div>
  </div>
  <div class="layout panel console">
    <div id="console-out-wrapper">
      <code><pre id="console-out"></pre></code>
    </div>
  </div>

  <div class="layout panel output">
    <div class="layout panel label">Meine Plots</div>
    <div id="image-out">
    </div>
  </div>
</div>

<style lang="scss">
  button {
    border: 2px #E76F51 solid;
    background-color: #E76F51;
    box-sizing: border-box;
    display: inline-flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    border-radius: 0.2em;
    text-shadow: rgba(0, 0, 0, 0.2) 0.1em 0.1em 0.5em;
    box-shadow: rgba(0, 0, 0, 0.2) 0.1em 0.1em 0.5em;
    color: white;
    font-weight: bold;
    height: 2em;
    width: 100%;
    transition: border-color 0.2s, background-color 0.2s;
  }

  button:hover {
    border: 2px white solid;
    background-color: #F4A261;
  }

  select {
    height: 2.5em;
  }

  .holder {
    display: inline-flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-around;
    gap: 0.5em;
    height: max-content;
  }

  .holder.left {
    justify-content: left;
  }

  .label {
    background-color: #2A9D8F;
    color: white;
    flex-wrap: nowrap;
    flex-direction: row;
    width: max-content;
    min-width: max-content;
    align-self: center;
    font-size: 1em;
  }

  .layout {
    box-sizing: border-box;
    padding: 0.5em;
    font-family: 'Lucida Sans', 'Lucida Sans Regular', 'Lucida Grande', 'Lucida Sans Unicode', Geneva, Verdana, sans-serif;
  }

  .layout.main {
    height: 100vh;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: minmax(0, 5fr) minmax(0, 1fr);
    gap: 0.5em;
  }

  .layout.panel {
    display: flex;
    flex-flow: column nowrap;
    /* border: 1px black solid; */
    border-radius: 0.2em;
    box-shadow: rgba(0, 0, 0, 0.2) 0.1em 0.1em 0.5em;
  }

  .layout.panel.divider {
    background-color: #E76F51;
    padding: 0.2em;
  }

  .layout.panel.code {
    grid-column: 1;
    grid-row: 1;
    display: flex;
    flex-flow: column nowrap;
    gap: 0.5em;
  }

  .layout.panel.console {
    grid-column: 1;
    grid-row: 2;
  }

  .layout.panel.output {
    grid-column: 2;
    grid-row: 1 / 3;
    height: 100%;
    display: flex;
    flex-flow: column;
    gap: 0.5em;
  }

  #console-out-wrapper {
    box-sizing: border-box;
    background-color: #264653;
    font-weight: bold;
    color: #E9C46A;
    width: 100%;
    height: 20vh;
    overflow-y: scroll;
    scrollbar-width: thin;
    padding: 0.5em;
    align-self: flex-end;
  }

  #console-out {
    text-wrap: wrap;
  }

  #editor-wrapper {
    height: 100%;
    min-height: 0;
    overflow-y: scroll;
    scrollbar-width: thin;
  }
  
  #image-out {
    display: flex;
    flex-flow: column nowrap;
    background-color: whitesmoke;
    padding: 0.3em;
    gap: 0.3em;
    height: 100%;
    min-height: 0;
    overflow-y: scroll;
    scrollbar-width: thin;
  }

  #title {
    background-color: #2A9D8F;
    color: white;
    flex-wrap: nowrap;
    flex-direction: row;
    width: max-content;
    min-width: max-content;
    display: inline-flex;
    flex-direction: row;
    align-items: center;
    height: 2em;
  }

  #preset-select {
    width: 100%;
  }
</style>