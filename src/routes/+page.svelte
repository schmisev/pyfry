<script lang="ts">
  import "$lib/page-style.scss";
  import "$lib/fonts.css";
  import { ALL_PRESETS, type CodePreset } from "$lib/presets";
  import { onMount } from "svelte";
  import CodeMirror from "svelte-codemirror-editor";
  import { python, pythonLanguage } from "@codemirror/lang-python";
  import { undo } from "@codemirror/commands";
  import { type EditorView } from "@codemirror/view";
  import { page } from "$app/state";
  import { downloadPreset, generatePresetFromString, generateStringFromPreset } from "$lib/preset-loading";
  import { type PyodideInterface, /* loadPyodide */ } from "pyodide";
  import { replaceState } from "$app/navigation";
  import Sortable from 'sortablejs';
  import { parseCSV, type CSVData } from "$lib/csv";
  import { tags } from "@lezer/highlight"
  import { HighlightStyle, syntaxHighlighting} from "@codemirror/language"
  import { CompletionContext, snippetCompletion, type CompletionSource } from '@codemirror/autocomplete'
  import { ALL_SNIPPETS } from "$lib/snippets";
  import iconFriedEgg from "$lib/assets/fried-egg.svg"
  import Fa from 'svelte-fa'
  import { faArrowRight, faBacon, faBreadSlice, faChartPie, faClock, faCloudDownload, faCloudDownloadAlt, faCloudUpload, faCopy, faDeleteLeft, faDownload, faEgg, faFileDownload, faFileUpload, faFlag, faFlagCheckered, faFolder, faFolderOpen, faHourglass, faQuestion, faRemove, faSplotch, faTableCells, faTrash, faUndo, faUndoAlt, faUpload, faVrCardboard } from '@fortawesome/free-solid-svg-icons'

  import PythonWorker from '$lib/workers/pyodide-worker.mjs?worker';
  import { pltAutocomplete } from "$lib/python/matplotlib.pyplot";
  import { npAutocomplete } from "$lib/python/numpy";

  const customPythonHighlighting = HighlightStyle.define([
    {tag: tags.keyword, color: "#2A9D8F", fontWeight: "bold"},
    {tag: tags.comment, color: "#F4A261", fontStyle: "italic"},
    {tag: tags.string, color: "#2A9D8F"},
    {tag: tags.number, color: "#A462F4", fontWeight: "bold"},
    {tag: tags.variableName, fontWeight: "bold"},
    
  ])

  const extensions = [
    syntaxHighlighting(customPythonHighlighting),
    python(),
    pythonLanguage.data.of({
      autocomplete: ALL_SNIPPETS.map((sn) => {
        return snippetCompletion(sn.insert, {
          label: sn.name,
          type: "preset",
          displayLabel: sn.display ?? sn.name,
          info: sn.info ?? `[ENTER] fügt das Snippet ein!`,
          boost: 100,
        })
      }),
    }),
    pythonLanguage.data.of({ autocomplete: npAutocomplete }),
    pythonLanguage.data.of({ autocomplete: pltAutocomplete }),
  ]

  // Helper functions
  let btoa2 = (v: string) => btoa(v);
  let atob2 = (v: string) => atob(v);

  function copyObj<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  let flags = $state({
    isRunning: false,
    updateURL: true,
  });

  let current_presets = $state(ALL_PRESETS.map(copyObj));
  let preset: CodePreset = $state(current_presets[0]); // get first preset
  let global_csv: CSVData[] = $state([[
    ["x", "y"],
    [1, 1],
    [2, 4],
    [3, 9],
    [4, 16],
  ]]);
  
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

    if (_name) preset.name = atob2(_name);
    if (_code) preset.code = atob2(_code);
    // if (_preamble) preset.preamble = atob2(_preamble); deactivated, as the same preamble should always be used
    if (_pseudo) preset.pseudo = atob2(_pseudo);
  }

  function updateURL() {
    if (!flags.updateURL) {
      replaceState("?", page.state);
      return;
    }

    let query = new URLSearchParams("");
    try {
      query.set('name', btoa2(preset.name));
      query.set('code', btoa2(preset.code));
      query.set('preamble', btoa2(preset.preamble));
      query.set('pseudo', btoa2(preset.pseudo));
    } catch {
      return;
    }
    // goto(`?${query.toString()}`);
    try {
      replaceState(`?${query.toString()}`, page.state);
    } catch {
      // do nothing
    }
  }

  function toggleURLUpdates() {
    flags.updateURL = !flags.updateURL; 
    updateURL();
  }

  function duplicatePreset() {
    const new_preset = copyObj(preset);
    new_preset.name += " " + (new Date()).toISOString();
    current_presets.push(new_preset);
    preset = current_presets.at(-1)!; // guaranteed, since we just added it
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

  function undoChange() {
    undo(editor);
  }

  $effect(updateURL);

  loadURLParams(); // fetch from URL

  // setting up the app
  let consoleOut: HTMLElement;
  let consoleOutWrapper: HTMLElement;
  let imageOut: HTMLElement;
  let editor: EditorView; // EditorView
  let worker: Worker;

  onMount(async () => {
    consoleOut = document.getElementById("console-out")!;
    consoleOutWrapper = document.getElementById("console-out-wrapper")!;
    imageOut = document.getElementById("image-out")!;

    let old_log = console.log;
    function log(msg: any, type: string = "standard") {
      let newMessage = document.createElement("div");
      newMessage.textContent = `${msg}`;
      newMessage.classList.add("message");
      newMessage.classList.add(type);
      consoleOut.appendChild(newMessage);
      consoleOutWrapper.scroll({top: consoleOut.scrollHeight, behavior: "smooth"});
      old_log(`${msg}`);
    }
    console.log = log;

    log("Drücke START, um dein Python-Skript auszuführen!\nBeim ersten Mal kann das etwas länger dauern, da erst die nötigen Bibliotheken heruntergeladen werden müssen.");

    worker = new PythonWorker();

    worker.onmessage = (event) => {
      flags.isRunning = false;
      const {error, message, result, pngList}: {error: string, result: number, message: string, pngList: string[]} = event.data;
      
      if (error) {
        log(error, "error");
        return;
      } else if (message) {
        log(message, "standard");
        return;
      }
      
      if (pngList) {
        log("Plots generiert: " + pngList.length, "plots");
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
    
    new Sortable(imageOut, {
      handle: ".img-handle",
      easing: "cubic-bezier(1, 0, 0, 1)",
    });
    
  });

  async function runCode() {
    if (flags.isRunning) return;
    flags.isRunning = true;

    const scriptPackage: {
        script: string;
        offset: number;
    } = generateStringFromPreset(preset);
    const context = {
      "csv_data": global_csv
    };

    worker.postMessage(JSON.stringify({
      id: 0,
      scriptPackage,
      context: context
    }));
  }

  function uploadCSV() {
    const element: HTMLInputElement = document.createElement('input');
    element.type = "file";
    element.accept = ".csv";
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
          let csv = parseCSV(contents);
          global_csv.push(csv); // set global csv
        }
      };
      reader.readAsText(file);
    }
    element.click();
    document.body.removeChild(element);
  }
</script>

<div class="layout main playpen-sans">
  <div class="layout panel code">
    <div class="holder left">
      <div id="title" class="layout panel"><img id="title-icon" src={iconFriedEgg}>&nbsp;<div id="title-text"><b>PYFRYHAM</b> by sms & cdr</div></div>
      <button class="{flags.updateURL ? 'active' : ''} playpen-sans" onclick={toggleURLUpdates}>URL {flags.updateURL ? "aktiv" : "inaktiv"}</button>
      <button title="Lade Code als .py-Datei herunter" onclick={() => downloadPreset(preset)}><Fa class="icon" icon={faCloudDownloadAlt} /></button>
      <button title="Lade Code in .py-Format hoch" onclick={uploadFile}><Fa class="icon" icon={faFolderOpen} /></button>
    </div>
    <div class="holder left">
      <button title="Entferne '{preset.name}'" class="bad" onclick={removePreset}><Fa class="icon" icon={faTrash} /></button>
      <button title="Dupliziere '{preset.name}'" onclick={duplicatePreset}><Fa class="icon" icon={faCopy} /></button>
      <button title="Rückgängig!" onclick={undoChange}><Fa class="icon" icon={faUndoAlt} /></button>
      <select id="preset-select" class="playpen-sans" bind:value={preset}>
        {#each current_presets.entries() as [i, p]}
          <option value={p}>{p.name}</option>
        {/each}
      </select>
      {#if flags.isRunning}
      <button title="Wird ausgeführt..." class="special playpen-sans">&nbsp;Warte...&nbsp;<Fa class="icon rotating" icon={faHourglass} /></button>
      {:else}
      <button title="Starte die Ausführung!" class="special playpen-sans" onclick={runCode}>&nbsp;START&nbsp;<Fa class="icon" icon={faFlagCheckered} /></button>
      {/if}
      
    </div>
    <div class="holder left">
      Name: 
      <input placeholder="Dateienname" id="name-input" class="playpen-sans" bind:value={preset.name}>
      .py
    </div>
    <div id="editor-wrapper">
      <CodeMirror extensions={extensions} lineWrapping={true} readonly={true} bind:value={preset.pseudo}></CodeMirror>
      <div class="layout panel divider"></div>
      <CodeMirror on:ready={(e) => editor = e.detail} extensions={extensions} lineWrapping={true} bind:value={preset.code}></CodeMirror>
    </div>
  </div>
  <div class="layout panel console">
    <div id="console-out-wrapper">
      <pre id="console-out"></pre>
    </div>
  </div>

  <div class="layout panel output">
    <div class="holder">
      <div class="layout panel label"><Fa class="icon" icon={faSplotch} />&nbsp;<span>Meine Plots</span></div>
    </div>
    <div id="image-out">
    </div>
    <button onclick={uploadCSV}><Fa class="icon" icon={faTableCells} />&nbsp;Lade .csv in &nbsp;<code>csv_data</code>&nbsp; hoch!</button>
    <div>
      {#each global_csv.entries() as [index, csv_table]}
        <div class="holder file-tab">
          <button onclick={() => global_csv.splice(index, 1)}><Fa class="icon"  icon={faRemove} /></button>
          &nbsp;<code>csv_data[{index}] = {JSON.stringify(csv_table)}</code>
        </div>
      {/each}
    </div>
  </div>
</div>