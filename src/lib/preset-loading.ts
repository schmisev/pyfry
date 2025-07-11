import { type CodePreset } from "./python/presets";

type SectionLabel = "name" | "code" | "preamble" | "pseudo";

function download(filename: string, text: string) {
  let element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(text)
  );
  element.setAttribute("download", filename);

  element.style.display = "none";
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

function sectionComment(label: SectionLabel) {
  return `###[${label}]`;
}

export type ScriptPackage = {
  script: string;
  offset: number;
};

export function generateStringFromPreset(preset: CodePreset): ScriptPackage {
  let retStr = "";

  retStr += sectionComment("name") + ` ${preset.name}\n`;
  retStr += sectionComment("pseudo") + `\n'''${preset.pseudo}'''\n`;
  retStr += sectionComment("preamble") + `\n${preset.preamble}\n`;
  let offset = retStr.split("\n").length;
  retStr += sectionComment("code") + `\n${preset.code}\n`;

  return {
    script: retStr,
    offset,
  };
}

export function downloadPreset(preset: CodePreset) {
  let content = generateStringFromPreset(preset);

  return download(
    (preset.name ? preset.name : "pyfryham")
      .replaceAll(" ", "_")
      .replaceAll(".", "_") + ".py",
    content.script
  );
}

export function generatePresetFromString(src: string): CodePreset {
  let preset = {
    name: "",
    preamble: "",
    pseudo: "",
    code: "",
  };

  const sections = src.split("###[");
  for (let s of sections) {
    let label = "";
    let index = 0;
    for (const c of s) {
      index++;
      if (c === "]") break;
      label += c; // building up label
    }

    let lines = s.split("\n");

    if (label in preset) {
      switch (label as SectionLabel) {
        case "name":
          preset.name = lines[0].slice(index + 1);
          break;
        case "code":
          preset.code = lines.slice(1).join("\n");
          break;
        case "preamble":
          preset.preamble = lines.slice(1).join("\n");
          break;
        case "pseudo":
          preset.pseudo = lines.slice(1).join("\n").slice(3, -4); // remove comments
          break;
      }
    }
  }

  return preset;
}
