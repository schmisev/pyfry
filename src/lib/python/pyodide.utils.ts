import type { ScriptPackage } from "$lib/preset-loading";

export function correctPyodideErrorMessage(error: Error, scriptPackage: ScriptPackage): {correctedMessage: string, lineNumber: number} {
  let position = error.message.search(`File "<exec>"`);
  if (position === -1) return { correctedMessage: error.message, lineNumber: 0 };
  let correctedMessage = error.message.slice(position);
  let lineNumberMatches = correctedMessage.match(/line [0-9]+\n/);
  let lineNumberStr = (lineNumberMatches) ? correctedMessage.match(/line [0-9]+\n/)![0] : "line 0";
  let lineNumber = parseInt(lineNumberStr.slice(5, lineNumberStr.length - 1));
  correctedMessage = correctedMessage.replace(`File "<exec>", line ${lineNumber}`, `Fehler in Zeile ${lineNumber - scriptPackage.offset}:`)
  return { correctedMessage, lineNumber };
}

export function stripParamString(str: string) {
  const hasType = (str.includes(":"));
  const hasDefault = (str.includes("="));

  let result = ""

  if (hasType) {
    result = str.split(":")[0];
    if (hasDefault) {
      result += "=" + str.split("=")[1];
    }
  } else {
    result = str;
  }

  return result;
}