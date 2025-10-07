import { tags } from "@lezer/highlight";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { python, pythonLanguage } from "@codemirror/lang-python";
import {
  CompletionContext,
  snippetCompletion,
  type Completion,
  type CompletionResult,
} from "@codemirror/autocomplete";

import { npCompletions } from "./numpy";
import { pltCompletions } from "./matplotlib.pyplot";
import { ALL_SNIPPETS } from "$lib/python/numpy.snippets";

export function wrapAutocomplete(prefix: RegExp, completions: Completion[]) {
  return (context: CompletionContext): null | CompletionResult => {
    let word = context.matchBefore(prefix);
    if (!word || (word.from == word.to && !context.explicit)) return null;
    return {
      from: word.from,
      options: completions.map((c) => snippetCompletion(c.label, c)),
    };
  };
}

function getCursorPosition(context: CompletionContext): {
  line: number;
  column: number;
} {
  const pos = context.state.selection.main.head;
  const line = context.state.doc.lineAt(pos);
  const column = pos - line.from + 1;
  return { line: line.number, column };
}

export type Signature = {
  name: string,
  params: string[],
  index: number,
}

export function jediAutocomplete(jediWorker: Worker, setFlag: (v: boolean) => void, updateSignature: (sig: Signature | null) => void) {
  return pythonLanguage.data.of({
    autocomplete: async (
      context: CompletionContext
    ): Promise<null | CompletionResult> => {
      const position = getCursorPosition(context);

      setFlag(true);
      jediWorker.postMessage({
        source: context.state.doc.toString(),
        position,
      });

      // there is nothing better
      // RPC library
      return new Promise((resolve, reject) => {
        jediWorker.addEventListener("message", (event) => {
          if (!event.data.completions || !event.data.signatures) return;

          const completions = JSON.parse(event.data.completions);
          const signatures = JSON.parse(event.data.signatures);

          setFlag(false);
          updateSignature(signatures ? signatures[0] : null);

          // if (completions.length === 0) return resolve(null);

          resolve({
            from: context.state.selection.main.head - (completions[0] ? completions[0][3] : 0),
            options: (completions as any[]).map((c: any) => {
              return { label: c[0], displayLabel: c[1], info: c[2], type: c[4] };
            }),
          });
        });
      });
    },
  });
}

export const npAutocomplete = wrapAutocomplete(/np\..*/, npCompletions);
export const pltAutocomplete = wrapAutocomplete(/plt\..*/, pltCompletions);

export const customPythonHighlighting = HighlightStyle.define([
  { tag: tags.keyword, color: "#2A9D8F", fontWeight: "bold" },
  { tag: tags.comment, color: "#F4A261", fontStyle: "italic" },
  { tag: tags.string, color: "#2A9D8F" },
  { tag: tags.number, color: "#A462F4", fontWeight: "bold" },
  { tag: tags.variableName, fontWeight: "bold" },
]);

export const pythonHighlighting = syntaxHighlighting(customPythonHighlighting);

export function pythonExtensions() {
  const extensions = [
    pythonHighlighting,
    python(),
    pythonLanguage.data.of({
      autocomplete: ALL_SNIPPETS.map((sn) => {
        return snippetCompletion(sn.insert, {
          label: sn.name,
          type: "preset",
          displayLabel: sn.display ?? sn.name,
          info: sn.info ?? `[ENTER] fügt das Snippet ein!`,
          boost: 100,
        });
      }),
    }),
    /*
    pythonLanguage.data.of({
      autocomplete: npAutocomplete
    }),
    pythonLanguage.data.of({
      autocomplete: pltAutocomplete
    })
    */
  ];

  return extensions;
}

export const pythonGameExtensions = [
  syntaxHighlighting(customPythonHighlighting),
  python(),
];
