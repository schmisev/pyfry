import { EditorView, showTooltip, type Tooltip } from "@codemirror/view";
import { EditorState, StateField } from "@codemirror/state";
import { CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
import { pythonLanguage } from "@codemirror/lang-python";
import { syntaxTree } from "@codemirror/language";

// utilities
function getCursorPosition(context: CompletionContext): {
  line: number;
  column: number;
  cursor: number;
} {
  const pos = context.state.selection.main.head;
  const line = context.state.doc.lineAt(pos);
  const column = pos - line.from + 1;
  return { cursor: pos, line: line.number, column };
}

function mapToType(pythonType: string) {
  switch (pythonType) {
    case "instance":
      return "function";
    case "statement":
      return "constant";
    default:
      return pythonType;
  }
}

// function signature
export type Signature = {
  name: string;
  params: [string, string][];
  index: number;
  doc: string;
};

// autocompletion via worker
export function jediAutocomplete(
  jediWorker: Worker,
  setFlag: (done: boolean, ready?: boolean) => void,
  updateSignature: (sig: Signature | null) => void
) {
  // receiving setup message
  const setupListener = (event: MessageEvent) => {
    if (event.data.id && event.data.id < 0) setFlag(false, true);
  };
  jediWorker.addEventListener("message", setupListener);

  // tracking requests
  let lastRequestId = 0;
  const requestIds = new Set<number>();

  function getRequestId(): number {
    requestIds.add(lastRequestId);
    return lastRequestId++;
  }

  function closeRequest(id: number) {
    if (requestIds.has(id)) {
      requestIds.delete(id);
    }

    if (requestIds.size === 0) {
      setFlag(false);
      if (lastRequestId > 100) lastRequestId = 0;
    }
  }

  // completion logic
  const PYTHON_IDENT = /^[\w\xa1-\uffff][\w\d\xa1-\uffff]*$/;
  const completeThis = ["VariableName", "PropertyName"];

  return pythonLanguage.data.of({
    autocomplete: async (context: CompletionContext): Promise<null | CompletionResult> => {
      let inner = syntaxTree(context.state).resolveInner(context.pos, -1);
      const complete = completeThis.indexOf(inner.name) > -1 || inner.name == ".";

      const position = getCursorPosition(context);
      const requestId = getRequestId();

      setFlag(true);
      jediWorker.postMessage({
        id: requestId,
        source: context.state.doc.toString(),
        position,
        skipCompletions: !complete,
      });

      // there is nothing better
      // RPC library
      return new Promise((resolve, reject) => {
        const listener = (event: MessageEvent) => {
          if (!event.data.completions || !event.data.signatures) return;
          const completions = JSON.parse(event.data.completions);
          const signatures = JSON.parse(event.data.signatures);
          const id = event.data.id;

          if (id !== requestId) {
            // console.log(`Wrong handler: id ${id} != id ${requestId}`);
            return;
          }

          closeRequest(id);
          // console.log(`Handled request: id ${id}, remaining: ${[...requestIds.keys()]}`);
          jediWorker.removeEventListener("message", listener);

          updateSignature(signatures ? signatures[0] : null);
          if (completions.length === 0) return resolve(null);

          resolve({
            from: context.state.selection.main.head - (completions[0] ? completions[0][3] : 0),
            options: (completions as any[]).map((c: any) => {
              return {
                label: c[0],
                displayLabel: c[0],
                info: c[2],
                type: mapToType(c[4]),
                detail: "",
              };
            }),
          });
        };

        jediWorker.addEventListener("message", listener);
      });
    },
  });
}

// (not used) tooltip on cursor
function cursorSignature(fetchSignature: () => Signature | null) {
  return (state: EditorState): readonly Tooltip[] =>
    state.selection.ranges
      .filter((range) => range.empty)
      .map((range) => {
        let sig: Signature | null = fetchSignature();
        if (!sig)
          return {
            pos: range.head,
            above: true,
            strictSide: true,
            arrow: true,
            create: () => {
              let dom = document.createElement("div");
              return { dom };
            },
          };

        let text = `${sig.name}(${sig.params
          .map((p, i) => (i == sig.index ? `<b>${p}</b>` : p))
          .join(", ")})`;

        return {
          pos: range.head,
          above: true,
          strictSide: true,
          arrow: true,
          create: () => {
            let dom = document.createElement("div");
            dom.className = "cm-tooltip-cursor";
            dom.innerHTML = text;
            return { dom };
          },
        };
      });
}

function cursorSignatureField(fetchSignature: () => Signature | null) {
  const getCursorSignature = cursorSignature(fetchSignature);

  return StateField.define<readonly Tooltip[]>({
    create: getCursorSignature,

    update(tooltips, tr) {
      if (!tr.docChanged && !tr.selection) return tooltips;
      return getCursorSignature(tr.state);
    },

    provide: (f) => showTooltip.computeN([f], (state) => state.field(f)),
  });
}

const cursorSignatureBaseTheme = EditorView.baseTheme({
  ".cm-tooltip.cm-tooltip-cursor": {
    backgroundColor: "#2A9D8F",
    fontFamily: "mononoki",
    color: "white",
    border: "none",
    padding: "2px 7px",
    borderRadius: "4px",
    "& .cm-tooltip-arrow:before": {
      borderTopColor: "#2A9D8F",
    },
    "& .cm-tooltip-arrow:after": {
      borderTopColor: "transparent",
    },
  },
});

export function cursorTooltip(fetchSignature: () => Signature | null) {
  return [cursorSignatureField(fetchSignature), cursorSignatureBaseTheme];
}
