<script lang="ts">
  import "$lib/page-style.scss";
  import "$lib/fonts.css";
  import { ALL_GAME_PRESETS, ALL_PRESETS, type CodePreset } from "$lib/presets";
  import { onMount } from "svelte";
  import CodeMirror from "svelte-codemirror-editor";
  import { python, pythonLanguage } from "@codemirror/lang-python";
  import { undo } from "@codemirror/commands";
  import { type EditorView } from "@codemirror/view";
  import { page } from "$app/state";
  import { downloadPreset, generatePresetFromString, generateStringFromPreset, type ScriptPackage } from "$lib/preset-loading";
  import { loadPyodide, type PyodideInterface, version as pyodideVersion } from "pyodide";
  import { replaceState } from "$app/navigation";
  import Sortable from 'sortablejs';
  import { parseCSV, type CSVData } from "$lib/csv";
  import { tags } from "@lezer/highlight"
  import { HighlightStyle, syntaxHighlighting} from "@codemirror/language"
  import { CompletionContext, snippetCompletion, type CompletionSource } from '@codemirror/autocomplete'
  import { ALL_SNIPPETS } from "$lib/snippets";
  import iconFriedEgg from "$lib/assets/fried-egg.svg"
  import Fa from 'svelte-fa'
  import { faA, faArrowRight, faBacon, faBaseball, faBreadSlice, faChartPie, faChess, faChessBoard, faChessPawn, faClock, faCloudDownload, faCloudDownloadAlt, faCloudUpload, faCompress, faCompressAlt, faCopy, faDeleteLeft, faDownload, faEgg, faFileDownload, faFileUpload, faFlag, faFlagCheckered, faFolder, faFolderOpen, faGamepad, faHourglass, faL, faPlay, faQuestion, faRemove, faSplotch, faStar, faStop, faTableCells, faTrash, faUndo, faUndoAlt, faUpload, faVrCardboard } from '@fortawesome/free-solid-svg-icons'
  import { error } from "@sveltejs/kit";
  import { HuiGame } from "$lib/game/hui";
  import { faFilesPinwheel, faSquareLetterboxd } from "@fortawesome/free-brands-svg-icons";
  import { correctPyodideErrorMessage } from "$lib/python/pyodide.utils";
  import { huiAutocomplete } from "$lib/game/hui.docs";
  import LZString from "lz-string";

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
    pythonLanguage.data.of({ autocomplete: huiAutocomplete }),
  ]

  // Helper functions
  let btoa2 = (v: string) => LZString.compressToBase64(v);
  let atob2 = (v: string) => LZString.decompressFromBase64(v);

  function copyObj<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  let flags = $state({
    isRunning: false,
    updateURL: true,
    gameIsRunning: false,
  });

  let copied_presets = ALL_GAME_PRESETS.map(copyObj);

  let current_presets = $state(copied_presets);
  let preset: CodePreset = $state(copied_presets[0]); // get first preset
  let compressed_code: string = $derived(btoa2(preset.code));
  
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
      query.set('code', compressed_code);
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
  let editor: EditorView; // EditorView
  let gameCanvas: HTMLCanvasElement;
  let gameCtx: CanvasRenderingContext2D;
  let pyodide: PyodideInterface;
  let diagnostics = $state({
    frame_times: [0, 0, 0, 0, 0],
    fps: 0,
    tick_time: 0,
    draw_time: 0,
    draw_things_time: 0,
    draw_layers_time: 0,
    key_time: 0,
    removal_time: 0,
    full_time: 0,
  });

  onMount(async () => {
    consoleOut = document.getElementById("console-out")!;
    consoleOutWrapper = document.getElementById("console-out-wrapper")!;
    gameCanvas = document.getElementById("game-canvas")! as HTMLCanvasElement;
    gameCtx = gameCanvas.getContext("2d")!;

    let old_log = console.log;
    function log(msg: any, type: string = "standard") {
      let newMessage = document.createElement("div");
      newMessage.textContent = `${msg}`;
      newMessage.classList.add("message");
      newMessage.classList.add(type);
      consoleOut.appendChild(newMessage);
      consoleOutWrapper.scroll({top: consoleOut.scrollHeight});
      old_log(`${msg}`);
    }
    console.log = log;

    flags.isRunning = true;
    pyodide = await loadPyodide({
      indexURL: `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full/`,
      fullStdLib: true,
      stdout: log
    });
    pyodide.setDebug(true);
    flags.isRunning = false;
  });

  async function stopGame() {
    flags.gameIsRunning = false;
  }

  async function runCode() {
    if (flags.isRunning || flags.gameIsRunning) return;

    // mark as running
    flags.isRunning = true;
    
    // clean console
    consoleOut.innerHTML = "";

    // get code
    const scriptPackage: ScriptPackage = generateStringFromPreset(preset);
    
    // clear global scope
    let hui_namespace = pyodide.globals.get("dict")();

    // setup game engine
    const hui = new HuiGame(document, gameCanvas, gameCtx, pyodide.pyimport("pyodide.ffi").create_proxy);
    hui_namespace.set("hui", hui);

    try {

      // run the game script
      await pyodide.runPythonAsync(scriptPackage.script, {globals: hui_namespace});

      // extract draw function
      const setupProxy = hui_namespace.get("setup");
      const drawProxy = hui_namespace.get("draw");

      // run the game
      if (setupProxy) {
        // set main setup function
        hui.setup = setupProxy;
        hui.prepare();
      }

      if (!drawProxy) {
        flags.isRunning = false;
        return;
      }

      // set main draw function
      hui.draw = drawProxy;

      let lastTimestamp: number;
      let firstTimestamp: number;
      const gameLoop = (timestamp: number) => {
        try {
          if (lastTimestamp === undefined || firstTimestamp === undefined) {
            firstTimestamp = timestamp;
            lastTimestamp = timestamp;
          }
          let dt = (timestamp - lastTimestamp) / 1000;
          let t = (timestamp - firstTimestamp) / 1000;
          lastTimestamp = timestamp;

          hui.step(t, dt);

          diagnostics = hui.diagnostics;

          if (!flags.gameIsRunning) {
            return;
          }
          requestAnimationFrame(gameLoop);
        } catch (error) {
          console.log((error as Error).message, "error");
          throw error;
        }
      }

      flags.gameIsRunning = true;
      requestAnimationFrame(gameLoop);
    } catch (error) {
      console.log((error as Error).message, "error");
    }
    
    flags.isRunning = false;
  }

</script>

<div class="layout main playpen-sans">
  <div class="layout panel code">
    <div class="holder left">
      <div id="title" class="layout panel"><img alt="A fried egg." id="title-icon" src={iconFriedEgg}>&nbsp;<div id="title-text"><b>PYFRY/GAME</b> by sms</div></div>
      <button class="{flags.updateURL ? 'active' : ''} playpen-sans" onclick={toggleURLUpdates}>URL {flags.updateURL ? "aktiv" : "inaktiv"} (<Fa class="icon" icon={faCompressAlt} /> {compressed_code.length} Zeichen)</button>
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
      <span title="Wird ausgeführt..." class="playpen-sans">&nbsp;Warte...&nbsp;<Fa class="icon rotating" icon={faHourglass} /></span>
      {:else if flags.gameIsRunning}
      <span title="Spiel läuft..." class="playpen-sans">&nbsp;Läuft...&nbsp;<Fa class="icon rotating" icon={faStar} /></span>
      {:else}
      <button title="Starte die Ausführung!" class="good playpen-sans" onclick={runCode}>&nbsp;PLAY&nbsp;<Fa class="icon" icon={faPlay} /></button>
      {/if}
      <button title="Stoppe das Spiel!" class="bad playpen-sans" onclick={stopGame}>&nbsp;STOP&nbsp;<Fa class="icon" icon={faStop} /></button>
      
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
      <div class="layout panel label"><Fa class="icon" icon={faGamepad} />&nbsp;<span>Mein Spiel</span></div>
    </div>
    <div id="image-out">
      <div class="game-wrapper">
        <canvas id="game-canvas" class="game-canvas crt" width="500" height="500"></canvas>
      </div>
      <div>{diagnostics.fps} frames per second</div>
      <div class="split-bar">
        <div id="tick-time" class="bar-segment" style="width: {100*diagnostics.tick_time/16}%;"></div>
        <div id="draw-time" class="bar-segment" style="width: {100*diagnostics.draw_time/16}%;"></div>
        <div id="draw-things-time" class="bar-segment" style="width: {100*diagnostics.draw_things_time/16}%;"></div>
        <div id="draw-layers-time" class="bar-segment" style="width: {100*diagnostics.draw_layers_time/16}%;"></div>
        <div id="key-time" class="bar-segment" style="width: {100*diagnostics.key_time/16}%;"></div>
        <div id="removal-time" class="bar-segment" style="width: {100*diagnostics.removal_time/16}%;"></div>
      </div>
    </div>
  </div>
</div>