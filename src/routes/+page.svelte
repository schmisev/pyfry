<script lang="ts">
  import "$lib/page-style.scss";
  import { ALL_PRESETS, type CodePreset } from "$lib/presets";
  import { onMount } from "svelte";
  import CodeMirror from "svelte-codemirror-editor";
  import { python } from "@codemirror/lang-python";
  import { page } from "$app/state";
  import { downloadPreset, generatePresetFromString, generateStringFromPreset } from "$lib/preset-loading";
  import { type PyodideInterface } from "pyodide";
  import { replaceState } from "$app/navigation";
  import { browser } from "$app/environment";
  import Sortable from 'sortablejs';

  // Helper functions
  let btoa2 = (v: string) => btoa(v);
  let atob2 = (v: string) => atob(v);

  function copyObj<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  let flags = $state({
    isRunning: false,
    cheatsheetBeginner: false,
    cheatsheetAdvanced: true
  });

  let current_presets = $state(ALL_PRESETS.map(copyObj));
  let preset: CodePreset = $state(current_presets[0]); // get first preset
  
  // preset uploads
  function uploadFile() {
    const element: HTMLInputElement = document.createElement('input');
    element.type = "file";
    document.body.appendChild(element)
    element.onchange = (e) => {
      if (!e.target || !(e.target as any).files) return
      let file = (e.target as any).files[0];
      if (!file) return;
      let reader = new FileReader();
      reader.onload = function(e) {
        if (!e.target) return;
        let contents = e.target.result;
        if (typeof contents === "string") {
          let new_preset = generatePresetFromString(contents);
          current_presets.push(new_preset);
          preset = new_preset;
        }
      };
      reader.readAsText(file);
    }
    element.click();
    document.body.removeChild(element);
  }

  function loadURLParams() {
    let _name = page.url.searchParams.get("name");
    let _code = page.url.searchParams.get("code");
    let _preamble = page.url.searchParams.get("preamble");
    let _pseudo = page.url.searchParams.get("pseudo");

    if (_name) preset.name = atob2(_name) + " [aus URL]";
    if (_code) preset.code = atob2(_code);
    if (_preamble) preset.preamble = atob2(_preamble);
    if (_pseudo) preset.pseudo = atob2(_pseudo);
  }

  function updateURL() {
    let query = new URLSearchParams("");
    query.set('name', btoa2(preset.name));
    query.set('code', btoa2(preset.code));
    query.set('preamble', btoa2(preset.preamble));
    query.set('pseudo', btoa2(preset.pseudo));
    // goto(`?${query.toString()}`);
    try {
      replaceState(`?${query.toString()}`, page.state);
    } catch {
      // do nothing
    }
  }

  function duplicatePreset() {
    const new_preset = copyObj(preset);
    new_preset.name += "+";
    current_presets.push(new_preset);
    preset = new_preset;
  }

  function removePreset() {
    let index = current_presets.indexOf(preset);
    current_presets.splice(index, 1);
    if (current_presets.length <= 0) {
      current_presets = ALL_PRESETS.map(copyObj);
    }
    preset = current_presets[0];
  }

  function reloadPresets() {
    current_presets = ALL_PRESETS.map(copyObj);
    preset = current_presets[0];
  }

  $effect(
    updateURL
  );

  loadURLParams(); // fetch from URL

  let consoleOut: HTMLElement;
  let imageOut: HTMLElement;
  let pyodide: PyodideInterface;
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

    
    new Sortable(imageOut, {
      handle: ".img-handle",
      easing: "cubic-bezier(1, 0, 0, 1)",
    });
    
  });

  async function runCode() {
    if (flags.isRunning) return;
    consoleOut.innerHTML = ""
    flags.isRunning = true;
    let ret;
    let pngList: string[] = [];
    try {
      ret = await pyodide.runPythonAsync(generateStringFromPreset(preset));
      pngList = pyodide.globals.get("plot_result");
    } catch (e) {
      console.log(e);
    }
    flags.isRunning = false;

    if (pngList) {
      console.log("Plots generiert: " + pngList.length);
      // console.log("" + pngList);
    }
    if (pngList.length === 0) return;
    // if (!pngList[-1]) return;

    for (const png of pngList) {
      const wrapper = document.createElement("div");
      wrapper.classList.add("img-wrapper");

      const handle = document.createElement("div");
      handle.classList.add("img-handle");

      const img = document.createElement('img');
      img.style.width = "100%";
      img.src = 'data:image/png;base64,' + png;
      
      wrapper.append(handle);
      wrapper.append(img);
      
      imageOut.prepend(wrapper);
      while (imageOut.children.length > 10) {
        imageOut.lastChild?.remove();
      }
    }
  }
</script>

<div class="layout main">
  <div class="layout panel code">
    <div class="holder left">
      <div id="title" class="layout panel"><div id="title-text"><b>🍳 PyFryHam</b> by sms & cdr</div></div>
      <button title="Lade Code als .py-Datei herunter" onclick={() => downloadPreset(preset)}>⬇️</button>
      <button title="Lade Code in .py-Format hoch" onclick={uploadFile}>📂</button>
    </div>
    <div class="holder left">
      <select id="preset-select" bind:value={preset}>
        {#each current_presets.entries() as [i, p]}
          <option value={p}>{p.name}</option>
        {/each}
      </select>
      <button title="Dupliziere '{preset.name}'" onclick={duplicatePreset}>➕</button>
      <button title="Entferne '{preset.name}'" onclick={removePreset}>❌</button>
      <button title="Vorlagen zurücksetzen" onclick={reloadPresets}>🔄️</button>
      <button title="Starte die Ausführung!" onclick={runCode}>&nbsp;{flags.isRunning ? "Warte ⌛" : "Start ▶️"}</button>
    </div>
    <div class="holder left">
      Name: 
      <input placeholder="Dateienname" id="name-input" bind:value={preset.name}>
      .py
    </div>
    <div id="editor-wrapper">
      <CodeMirror lineWrapping={true} readonly={true} bind:value={preset.pseudo} lang={python()}></CodeMirror>
      <div class="layout panel divider"></div>
      <CodeMirror lineWrapping={true} bind:value={preset.code} lang={python()}></CodeMirror>
    </div>
  </div>
  <div class="layout panel console">
    <div id="console-out-wrapper">
      <code><pre id="console-out"></pre></code>
    </div>
  </div>

  <div class="layout panel output">
    <div class="holder">
      <div class="layout panel label"><span>🥓 Meine Plots</span></div>
      <a href="https://matplotlib.org/cheatsheets/_images/cheatsheets-1.png" target="_blank">⁉️</a>
      <a href="https://matplotlib.org/cheatsheets/_images/handout-beginner.png" target="_blank">🤔</a>
    </div>
    <div id="image-out">
    </div>
  </div>
</div>