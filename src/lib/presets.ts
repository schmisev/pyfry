export interface CodePreset {
  name: string;
  preamble: string;
  pseudoPreamble: string;
  code: string;
}

export const STD_PREAMBLE = `# Preambel
import matplotlib.pyplot as plt
import numpy as np
from io import BytesIO
import base64

def new_show():
  buf = BytesIO()
  plt.savefig(buf, format='png')
  plt.clf()
  return base64.b64encode(buf.getvalue()).decode('utf-8')

plt.show = new_show
new_show()`;

export const STD_PSEUDO_PREAMBLE = `# Import
import matplotlib.pyplot as plt
import numpy as np`;

export const ALL_PRESETS: CodePreset[] = [
  {
    name: "...",
    preamble: STD_PREAMBLE,
    pseudoPreamble: STD_PSEUDO_PREAMBLE,
    code: `# Hier könnte dein Code stehen`,
  },
  {
    name: "Sinus und Cosinus",
    preamble: STD_PREAMBLE,
    pseudoPreamble: STD_PSEUDO_PREAMBLE,
    code: `# Sinus und Cosinus
x = np.arange(0, 4 * np.pi, 0.1)
y1 = np.cos(x)
y2 = 0.5 * np.sin(x - np.pi) + 0.5

plt.plot(x, y1)
plt.plot(x, y2)
plt.show()`,
  },
  {
    name: "Scatterplot mit Messdaten",
    preamble: STD_PREAMBLE,
    pseudoPreamble: STD_PSEUDO_PREAMBLE,
    code: `# Scatterplot mit Messdaten
x = np.array([1, 2, 3, 4, 5]);
y = np.array([1, 4.2, 8.1, 16.5, 25.02]);
plt.scatter(x, y);
plt.show()`,
  }
]
