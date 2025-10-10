import { tags } from "@lezer/highlight";
import {
  HighlightStyle,
  syntaxHighlighting,
  syntaxTree,
} from "@codemirror/language";
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