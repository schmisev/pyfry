<script lang="ts">
  import "$lib/page-style.css";
  import "$lib/fonts.css";
  import { numpyPresets, type CodePreset } from "$lib/python/presets";
  import { onMount } from "svelte";
  import CodeMirror from "svelte-codemirror-editor";
  import { undo } from "@codemirror/commands";
  import { EditorView, showTooltip, type Tooltip } from "@codemirror/view";
  import { EditorState, StateEffect, StateField } from "@codemirror/state";
  import { page } from "$app/state";
  import {
    downloadPreset,
    generatePresetFromString,
    generateStringFromPreset,
  } from "$lib/preset-loading";
  import { replaceState } from "$app/navigation";
  import Sortable from "sortablejs";
  import { parseCSV, type CSVData } from "$lib/csv";
  import iconFriedEgg from "$lib/assets/fried-egg.svg";
  import Fa from "svelte-fa";
  import {
    faArrowDown,
    faArrowRight,
    faArrowUp,
    faBacon,
    faBreadSlice,
    faCaretDown,
    faCaretUp,
    faChartPie,
    faClock,
    faCloudDownload,
    faCloudDownloadAlt,
    faCloudUpload,
    faCompressAlt,
    faCopy,
    faDeleteLeft,
    faDownload,
    faEgg,
    faFileDownload,
    faFileUpload,
    faFlag,
    faFlagCheckered,
    faFolder,
    faFolderOpen,
    faHandSparkles,
    faHourglass,
    faJedi,
    faLightbulb,
    faQuestion,
    faRemove,
    faSplotch,
    faStar,
    faTableCells,
    faTrash,
    faUndo,
    faUndoAlt,
    faUpload,
    faVrCardboard,
    faWalkieTalkie,
    faWandMagic,
    faWandMagicSparkles,
    faWandSparkles,
  } from "@fortawesome/free-solid-svg-icons";

  import PythonWorker from "$lib/workers/pyodide-worker.mjs?worker";
  import JediWorker from "$lib/workers/jedi-worker.mts?worker";
  import {
    cursorTooltip,
    jediAutocomplete,
    pythonExtensions,
    type Signature,
  } from "$lib/python/mode";
  import { zip, type VersionType } from "$lib/compression";
  import { pythonLanguage } from "@codemirror/lang-python";
  import { stripParamString } from "$lib/python/pyodide.utils";

  /**
   * URL versions
   * ============
   * if no v= exists, the URL will be decoded by regular btoa
   * v=1: LZString
   * v=2: zlib (???)
   */
  let currentVersion: VersionType = "1";

  function copyObj<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  let flags = $state({
    isRunning: false,
    updateURL: true,
    showPseudo: false,
    autocompleteIsRunning: true,
  });

  let currentState = $state(page.url.href);

  let currentPresets = $state(numpyPresets.map(copyObj));
  let preset: CodePreset = $state(currentPresets[0]); // get first preset
  let global_csv: CSVData[] = $state([
    [
      ["x", "y"],
      [1, 1],
      [2, 4],
      [3, 9],
      [4, 16],
    ],
  ]);

  // preset uploads
  function uploadFile() {
    const element: HTMLInputElement = document.createElement("input");
    element.type = "file";
    document.body.appendChild(element);
    element.onchange = (e) => {
      if (!e.target || !(e.target as any).files) return;
      let file = (e.target as any).files[0];
      if (!file) return;
      let reader = new FileReader();
      reader.onload = function (e) {
        if (!e.target) return;
        let contents = e.target.result;
        if (typeof contents === "string") {
          let new_preset = generatePresetFromString(contents);
          currentPresets.push(new_preset);
          preset = new_preset;
        }
      };
      reader.readAsText(file);
    };
    element.click();
    document.body.removeChild(element);
  }

  function loadURLParams() {
    let _name = page.url.searchParams.get("name");
    let _code = page.url.searchParams.get("code");
    let _preamble = page.url.searchParams.get("preamble");
    let _pseudo = page.url.searchParams.get("pseudo");
    let _version = page.url.searchParams.get("v") as VersionType;

    let _atob = (v: string) => zip(true, _version, v);

    if (_name) preset.name = _atob(_name);
    if (_code) preset.code = _atob(_code);
    // if (_preamble) preset.preamble = atob2(_preamble); deactivated, as the same preamble should always be used
    if (_pseudo) preset.pseudo = _atob(_pseudo);
  }

  function updateURL() {
    if (!flags.updateURL) {
      replaceState("?", page.state);
      return;
    }

    let _btoa = (v: string) => zip(false, currentVersion, v);

    let query = new URLSearchParams("");
    try {
      query.set("v", currentVersion || "0");
      query.set("name", _btoa(preset.name));
      query.set("code", _btoa(preset.code));
      query.set("preamble", _btoa(preset.preamble));
      query.set("pseudo", _btoa(preset.pseudo));
    } catch (e) {
      console.error(e);
    }
    // goto(`?${query.toString()}`);
    try {
      currentState = `?${query.toString()}`;
      replaceState(currentState, page.state);
    } catch (e) {
      console.error(e);
    }
  }

  function toggleURLUpdates() {
    flags.updateURL = !flags.updateURL;
    updateURL();
  }

  function duplicatePreset() {
    const new_preset = copyObj(preset);
    new_preset.name += " " + new Date().toISOString();
    currentPresets.push(new_preset);
    preset = currentPresets.at(-1)!; // guaranteed, since we just added it
  }

  function removePreset() {
    let index = currentPresets.indexOf(preset);
    currentPresets.splice(index, 1);
    if (currentPresets.length <= 0) {
      currentPresets = numpyPresets.map(copyObj);
    }
    preset = currentPresets[0];
  }

  function reloadPresets() {
    currentPresets = numpyPresets.map(copyObj);
    preset = currentPresets[0];
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
  let jediWorker: Worker;
  let liveSignature: Signature | null = $state(null);

  // editor setup
  // start up tooltips

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
      consoleOutWrapper.scroll({
        top: consoleOut.scrollHeight,
        behavior: "smooth",
      });
      old_log(`${msg}`);
    }
    console.log = log;

    log(
      "Drücke START, um dein Python-Skript auszuführen!\nBeim ersten Mal kann das etwas länger dauern, da erst die nötigen Bibliotheken heruntergeladen werden müssen.",
    );

    // checking code
    jediWorker = new JediWorker();

    // start up autocompleter
    editor.dispatch({
      effects: StateEffect.appendConfig.of(
        jediAutocomplete(
          jediWorker,
          (v) => {
            flags.autocompleteIsRunning = v;
          },
          (sig) => {
            liveSignature = sig;
          },
        ),
      ),
    });

    jediWorker.addEventListener("message", (event) => {
      const { message, id }: { message: string; id: number } = event.data;
      if (message) {
        log(message);
      }

      if (id && id < 0) {
        flags.autocompleteIsRunning = false;
      }
    });

    // running code
    worker = new PythonWorker();

    worker.onmessage = (event) => {
      flags.isRunning = false;
      const {
        error,
        message,
        result,
        pngList,
      }: { error: string; result: number; message: string; pngList: string[] } =
        event.data;

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

      /*
      if (result) {
        log(result, "standard");
      }
        */

      for (const png of pngList) {
        const wrapper = document.createElement("div");
        wrapper.classList.add("img-wrapper");

        const handle = document.createElement("div");
        handle.classList.add("img-handle");

        const img = document.createElement("img");
        img.style.width = "100%";
        img.src = "data:image/png;base64," + png;

        wrapper.append(handle);
        wrapper.append(img);

        imageOut.prepend(wrapper);
        while (imageOut.children.length > 10) {
          imageOut.lastChild?.remove();
        }
      }
    };

    // show images
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
      csv_data: global_csv,
    };

    worker.postMessage(
      JSON.stringify({
        id: 0,
        scriptPackage,
        context,
      }),
    );
  }

  function uploadCSV() {
    const element: HTMLInputElement = document.createElement("input");
    element.type = "file";
    element.accept = ".csv";
    document.body.appendChild(element);
    element.onchange = (e) => {
      if (!e.target || !(e.target as any).files) return;
      let file = (e.target as any).files[0];
      if (!file) return;
      let reader = new FileReader();
      reader.onload = function (e) {
        if (!e.target) return;
        let contents = e.target.result;
        if (typeof contents === "string") {
          let csv = parseCSV(contents);
          global_csv.push(csv); // set global csv
        }
      };
      reader.readAsText(file);
    };
    element.click();
    document.body.removeChild(element);
  }
</script>

<div class="layout main playpen-sans">
  <div class="layout panel code">
    <div class="holder left">
      <div id="title" class="layout panel">
        <img id="title-icon" alt="A fried egg." src={iconFriedEgg} />&nbsp;
        <div id="title-text"><b>PYFRYHAM</b> by sms & cdr</div>
      </div>
      <button
        class="{flags.updateURL ? 'active' : ''} playpen-sans"
        onclick={toggleURLUpdates}
        >URL {flags.updateURL ? "aktiv" : "inaktiv"} (<Fa
          class="icon"
          icon={faCompressAlt}
        />
        {currentState.length} Zeichen)</button
      >
      <button
        title="Lade Code als .py-Datei herunter"
        onclick={() => downloadPreset(preset)}
        ><Fa class="icon" icon={faCloudDownloadAlt} /></button
      >
      <button title="Lade Code in .py-Format hoch" onclick={uploadFile}
        ><Fa class="icon" icon={faFolderOpen} /></button
      >
    </div>
    <div class="holder left">
      <button
        title="Entferne '{preset.name}'"
        class="bad"
        onclick={removePreset}><Fa class="icon" icon={faTrash} /></button
      >
      <button title="Dupliziere '{preset.name}'" onclick={duplicatePreset}
        ><Fa class="icon" icon={faCopy} /></button
      >
      <button title="Rückgängig!" onclick={undoChange}
        ><Fa class="icon" icon={faUndoAlt} /></button
      >
      <select id="preset-select" class="playpen-sans" bind:value={preset}>
        {#each currentPresets.entries() as [i, p]}
          <option value={p}>{p.name}</option>
        {/each}
      </select>
      {#if flags.isRunning}
        <button title="Wird ausgeführt..." class="special playpen-sans"
          >&nbsp;Warte...&nbsp;<Fa
            class="icon rotating"
            icon={faHourglass}
          /></button
        >
      {:else}
        <button
          title="Starte die Ausführung!"
          class="special playpen-sans"
          onclick={runCode}
          >&nbsp;START&nbsp;<Fa class="icon" icon={faFlagCheckered} /></button
        >
      {/if}
    </div>
    <div class="holder left">
      Name:
      <input
        placeholder="Dateienname"
        id="name-input"
        class="playpen-sans p-3.5"
        bind:value={preset.name}
      />
      .py
    </div>
    <div id="editor-wrapper">
      {#if flags.showPseudo}
        <CodeMirror
          extensions={pythonExtensions()}
          lineWrapping={true}
          readonly={true}
          bind:value={preset.pseudo}
        ></CodeMirror>
      {/if}
      <button
        class="layout panel divider"
        onclick={() => {
          flags.showPseudo = !flags.showPseudo;
        }}
      >
        {#if flags.showPseudo}<Fa class="icon" icon={faCaretUp}></Fa>
        {:else}<Fa class="icon" icon={faCaretDown}></Fa>
        {/if}
      </button>
      <CodeMirror
        class="main-editor"
        on:ready={(e) => (editor = e.detail)}
        extensions={[
          //...cursorTooltip(() => liveSignature),
          ...pythonExtensions(),
        ]}
        lineWrapping={true}
        bind:value={preset.code}
      ></CodeMirror>
    </div>
    <div class="flex flex-row items-center gap-1 mononoki text-sm">
      {#if flags.autocompleteIsRunning}
        <Fa class="icon rotating" icon={faHourglass} />
      {:else}
        <Fa class="icon" icon={faWandMagicSparkles}></Fa>
      {/if}
      {flags.autocompleteIsRunning ? "..." : ""}
      {#if liveSignature}
        <span>
          <b>{liveSignature.name}</b
          >({#each liveSignature.params.entries() as [i, n]}
            {#if i == liveSignature.index}
              <b><u>{n[1]}</u></b>
            {:else}
              {stripParamString(n[1])}
            {/if}{#if i != liveSignature.params.length - 1},&nbsp;{/if}
          {/each})
        </span>
      {/if}
    </div>
    <button onclick={uploadCSV}
      ><Fa class="icon" icon={faTableCells} />&nbsp;Lade .csv-Datei in &nbsp;<code
        >csv_data</code
      >&nbsp; hoch!</button
    >
    <div>
      {#each global_csv.entries() as [index, csv_table]}
        <div class="holder file-tab">
          <button onclick={() => global_csv.splice(index, 1)}
            ><Fa class="icon" icon={faRemove} /></button
          >
          &nbsp;<code>csv_data[{index}] = {JSON.stringify(csv_table)}</code>
        </div>
      {/each}
    </div>
  </div>

  <div class="layout panel console right">
    <div id="console-out-wrapper">
      <pre id="console-out"></pre>
    </div>
  </div>

  <div class="layout panel output">
    <div class="holder">
      <div class="layout panel label">
        <Fa class="icon" icon={faSplotch} />&nbsp;<span>Meine Plots</span>
      </div>
    </div>
    <div id="image-out"></div>
  </div>
</div>
