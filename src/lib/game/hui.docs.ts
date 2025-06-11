import { wrapAutocomplete } from "$lib/faux-language-server"
import { type Completion } from "@codemirror/autocomplete"

const huiCompletions: Completion[] = []
export const huiAutocomplete = wrapAutocomplete(/hui\..*/, huiCompletions); 