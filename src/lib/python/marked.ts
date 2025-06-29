import hljs from "highlight.js";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";

export const pythonMarked = new Marked(
  markedHighlight({
    emptyLangClass: "hljs",
    langPrefix: "hljs language-",
    highlight(code, lang, info) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
  })
);
