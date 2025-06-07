import {CompletionContext, type Completion, type CompletionResult, type CompletionSource} from "@codemirror/autocomplete"

export function wrapAutocomplete(prefix: RegExp, completions: Completion[]) {
  return (context: CompletionContext): null | CompletionResult => {
    let word = context.matchBefore(prefix)
    if (!word || word.from == word.to && !context.explicit)
      return null
    return {
      from: word.from,
      options: completions
    }
  }
}