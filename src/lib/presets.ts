export interface CodePreset {
  name: string;
  preamble: string;
  pseudo: string;
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
    pseudo: STD_PSEUDO_PREAMBLE,
    code: `# Hier könnte dein Code stehen`,
  },
  {
    name: "Sinus und Cosinus",
    preamble: STD_PREAMBLE,
    pseudo: STD_PSEUDO_PREAMBLE,
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
    pseudo: STD_PSEUDO_PREAMBLE,
    code: `# Scatterplot mit Messdaten
x = np.array([1, 2, 3, 4, 5]);
y = np.array([1, 4.2, 8.1, 16.5, 25.02]);
plt.scatter(x, y);
plt.show()`,
  },
  {
    name: "Vollständiges Beispiel mit polynomieller Regression",
    preamble: STD_PREAMBLE,
    pseudo: STD_PSEUDO_PREAMBLE,
    code: `# Zusätzliche Imports
from matplotlib.ticker import MaxNLocator
from numpy.polynomial.polynomial import Polynomial as pn

# Messdaten
x = np.array([1, 1,   1,   1,   2,   2,   2,    2,   3,   3, 3,   4,    5]);
y = np.array([1, 0.9, 1.5, 2.3, 4.2, 5.0, 3.99, 4.0, 8.1, 9, 9.1, 16.5, 25.02]);

# Polynomielle Regression
A, B, C = np.polynomial.polynomial.polyfit(x, y, 2);
x_fit = np.arange(np.min(x), np.max(x), 0.01)
y_fit = A * x_fit**2 + B * x_fit + C

fig, ax = plt.subplots()

# Anzeigen von Scatter- und Linienplot
ax.plot(x_fit, y_fit, color="red", linestyle="-.");
ax.scatter(x, y, marker="x");

ax.grid(linestyle = "--"); # damit ein Gitter erscheint
ax.xaxis.set_major_locator(MaxNLocator(integer=True)); # damit die x-Achse ganze Zahlen verwendet

# Achsenbeschriftungen und Titel
plt.xlabel("Versuche")
plt.ylabel("Erfolgschance [%]")

plt.title("Trickshots", color="green", weight="bold")
plt.show()
    `
  }
]
