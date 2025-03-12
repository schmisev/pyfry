export interface CodePreset {
  name: string;
  preamble: string;
  pseudo: string;
  code: string;
}

export const STD_PREAMBLE = `# Preambel
import matplotlib.pyplot as plt
import numpy as np
import numpy.polynomial.polynomial as pn
from io import BytesIO
import base64

plot_result = []

def new_show(append=True):
  global plot_result
  buf = BytesIO()
  plt.savefig(buf, format='png')
  plt.clf()
  result = base64.b64encode(buf.getvalue()).decode('utf-8')
  if append:
    plot_result.append(result)
  else:
    return result

plt.show = new_show
new_show(False)

csv_data = csv_data.to_py()
`;

export const STD_PSEUDO_PREAMBLE = `# Import
import matplotlib.pyplot as plt
import numpy as np
import numpy.polynomial.polynomial as pn
csv_data = ... # Daten aus csv-Import`;

export const ALL_PRESETS: CodePreset[] = [
  /*
  {
    name: "Startpunkt",
    preamble: STD_PREAMBLE,
    pseudo: STD_PSEUDO_PREAMBLE,
    code: `# Hier könnte dein Code stehen`,
  },
  */
  {
    name: "Scatterplot mit linearer Regression",
    preamble: STD_PREAMBLE,
    pseudo: STD_PSEUDO_PREAMBLE,
    code: `
# Eingabe der Messdaten
x = np.array([0, 1, 2.1, 2.9])
y = np.array([0, 8, 10, 14.65])

# Messdaten anzeigen
plt.scatter(x, y, 
            marker = "x", 
            color = "blue")

''' # auskommentiert
# Lineare Regression
t, m = pn.polyfit(x, y, 1)
x_fit = np.linspace(0, max(x), 100)
y_fit =  m * x_fit + t

plt.plot(x_fit, y_fit, 
         color = "red", 
         linestyle = "-",
         label = f"y = {m:.3f} * x + {t:.3f}")
plt.legend()
''' # Ende auskommentiert

# Beschriftungen
plt.title("Überschrift", 
          color = "black", 
          weight = "bold")
plt.xlabel("x-Achsen Beschriftung")
plt.ylabel("y-Achsen Beschriftung")

# Achsen
plt.xlim(left = 0)
plt.ylim(bottom = 0)
plt.grid(linestyle = "-")

# Erstelle Diagramm
plt.show()`
  },
  {
    name: "Scatterplot mit linearer Regression durch y=0",
    preamble: STD_PREAMBLE,
    pseudo: STD_PSEUDO_PREAMBLE,
    code: `
# Eingabe der Messdaten
x = np.array([0, 1, 2.1, 5])
y = np.array([1, 2, 3, 4])

# Messdaten anzeigen
plt.scatter(x, y, 
            marker = "x", 
            color = "blue")

''' auskommentiert
# Lineare Regression
A = np.vstack([x, np.zeros(len(x))]).T
m, t = np.linalg.lstsq(A, y)[0] # LeaST SQuares
x_fit = np.linspace(0, 5, 100)
y_fit =  m * x_fit + t

plt.plot(x_fit, y_fit, 
          color = "red", 
          linestyle = "-",
          label = f"y = {m:.3f} * x + {t:.3f}")
plt.legend()
''' # Ende auskommentiert

# Beschriftungen
plt.title("Überschrift", 
          color = "black", 
          weight = "bold")
plt.xlabel("x-Achsen Beschriftung")
plt.ylabel("y-Achsen Beschriftung")

# Achsen
plt.xlim(left = 0)
plt.ylim(bottom = 0)
plt.grid(linestyle = "-")

# Erstelle Diagramm
plt.show()`
  },
  /*
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
    name: "Scatterplot mit Messdaten (Wertpaare)",
    preamble: STD_PREAMBLE,
    pseudo: STD_PSEUDO_PREAMBLE,
    code: `# Scatterplot mit Messdaten (Wertpaare)
data = np.array([
  [0, 1],
  [0.1, 1.2],
  [0.2, 1.8],
  [0.3, 2.3],
  [0.5, 3.0],
  [0.6, 5.1],
])

plt.scatter(data[:,0], data[:,1]);
plt.show()`
  },
  {
    name: "Vollständiges Beispiel mit polynomieller Regression",
    preamble: STD_PREAMBLE,
    pseudo: STD_PSEUDO_PREAMBLE,
    code: `# Zusätzliche Imports
from matplotlib.ticker import MaxNLocator
import numpy.polynomial.polynomial as pn

# Messdaten
x = np.array([1, 1,   1,   1,   2,   2,   2,    2,   3,   3, 3,   4,    5]);
y = np.array([1, 0.9, 1.5, 2.3, 4.2, 5.0, 3.99, 4.0, 8.1, 9, 9.1, 16.5, 25.02]);

# Polynomielle Regression
C, B, A = pn.polyfit(x, y, 2);
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
plt.show()`
  },
  {
    name: "Mehrere verschiedene Plots",
    preamble: STD_PREAMBLE,
    pseudo: STD_PSEUDO_PREAMBLE,
    code: `# Mehrere verschiedene Plots

# Werte & Beschriftungen
labels = ["A", "B", "C", "D", "E"];
values = [1, 2, 5, 4, 7];

# Kuchendiagramm
plt.title("Ein Kuchendiagramm")
plt.pie(values, labels=labels)
plt.show()

# Kuchendiagramm
plt.title("Ein Säulendiagramm")
plt.bar(labels, values)
plt.show()
    `
  },
  {
    name: "Bruchkurve",
    preamble: STD_PREAMBLE,
    pseudo: STD_PSEUDO_PREAMBLE,
    code: `# Spannungs-Dehnungs-Diagramm
import random

def stress_strain(xs, D, ReL, ReH, Rm, AL, Ag, A):
  ys = []
  mode = 0

  for x in xs:
    if mode == 0:
      # elastic
      y = D * x
      if y >= ReH:
        mode = 1
    elif mode == 1:
      # nicht-linear el.
      y = ReL + 0.8 * (ReH - ReL) * random.random()
      if x > AL:
        mode = 2
    elif mode == 2:
      # inelastisch
      b = (Rm-ReL) / (AL - Ag)**2
      y = Rm - b * (x - Ag)**2
      if x > A:
        mode = 3
    else:
      y = None
        
    ys.append(y)
  return ys
      

D = 10
ReL = 1.2
ReH = 1.3
Rm = 1.7
AL = 0.2
Ag = 0.5
A = 0.7

x = np.linspace(0, 1, 1000)
y = stress_strain(x, D, ReL, ReH, Rm, AL, Ag, A)

plt.plot(x, y)
plt.axhline(y=ReL, color="black", ls="--")
plt.axhline(y=ReH, color="black", ls="--")
plt.axhline(y=Rm, color="black", ls="--")
plt.axvline(x=AL, color="green", ls=":")
plt.axvline(x=Ag, color="green", ls=":")
plt.axvline(x=A, color="green", ls=":")

ax = plt.gca()
ax.set_xlim([0, 1])

plt.show()`
  }
  */
]
