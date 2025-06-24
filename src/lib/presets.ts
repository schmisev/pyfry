export interface CodePreset {
  name: string;
  preamble: string;
  pseudo: string;
  code: string;
}

export const STD_PREAMBLE = `# Preambel
import matplotlib
matplotlib.use("Agg")
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
  {
    name: "Startpunkt",
    preamble: STD_PREAMBLE,
    pseudo: STD_PSEUDO_PREAMBLE,
    code: `# Hier könnte dein Code stehen`,
  },
  {
    name: "Scatterplot (standard)",
    preamble: STD_PREAMBLE,
    pseudo: STD_PSEUDO_PREAMBLE,
    code: `# Eingabe der Messdaten
data = np.array([
  [1,1],
  [2,4],
  [3,9]
])
data_x = data[:,0]
data_y = data[:,1]

# Messdaten in Diagramm anzeigen
plt.title("Überschrift", 
          color = "black", 
          weight = "bold")
plt.xlabel("x-Achsen Beschriftung")
plt.ylabel("y-Achsen Beschriftung")

plt.scatter(data_x, data_y, 
            marker = "x", 
            color = "blue")

# Funktion zeichnen 
x = np.linspace(0,max(data_x),100)

y = 2 * x + 1

plt.plot(x, y, color = "green", label = "f(x) = ")
plt.legend()

# Achsen
plt.xlim(left = 0)
plt.ylim(bottom = 0)
plt.grid(which = 'major', 
        linestyle = '-', 
        alpha = 0.8)
plt.grid(which = 'minor', 
        linestyle = "--",  
        alpha = 0.5)
plt.minorticks_on()

# Erstelle Diagramm
plt.show()`
  },
  {
    name: "Scatterplot (csv)",
    preamble: STD_PREAMBLE,
    pseudo: STD_PSEUDO_PREAMBLE,
    code: `# Eingabe der Messdaten
data = np.array(csv_data[0][1:])
data_x = data[:,0]
data_y = data[:,1]

# Messdaten in Diagramm anzeigen
plt.title("Überschrift", 
          color = "black", 
          weight = "bold")
plt.xlabel("x-Achsen Beschriftung")
plt.ylabel("y-Achsen Beschriftung")

plt.scatter(data_x, data_y, 
            marker = "x", 
            color = "blue")

# Funktion zeichnen 
x = np.linspace(0,max(data_x),100)

y = 2 * x + 1

plt.plot(x, y, color = "green", label = "f(x) = ")
plt.legend()

# Achsen
plt.xlim(left = 0)
plt.ylim(bottom = 0)
plt.grid(which = 'major', 
        linestyle = '-', 
        alpha = 0.8)
plt.grid(which = 'minor', 
        linestyle = "--",  
        alpha = 0.5)
plt.minorticks_on()

# Erstelle Diagramm
plt.show()`
  },
  /*
  {
    name: "Scatterplot mit linearer Regression durch y=0",
    preamble: STD_PREAMBLE,
    pseudo: STD_PSEUDO_PREAMBLE,
    code: `# Eingabe der Messdaten
data = np.array([
  [1,1],
  [2,4],
  [3,9],
  [4,7],
  [5,2]
])
x = data[:,0]
y = data[:,1]

# Messdaten anzeigen
plt.scatter(x, y, 
            marker = "x", 
            color = "blue")

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
    name: "Sinus und Cosinus",
    preamble: STD_PREAMBLE,
    pseudo: STD_PSEUDO_PREAMBLE,
    code: `# Sinus und Cosinus
x = np.arange(0, 4 * np.pi, 0.1)
y1 = np.cos(x)
y2 = np.sin(x)

plt.plot(x, y1)
plt.plot(x, y2)
plt.show()`,
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

export const GAME_PREAMBLE = `# Preambel
import math
import random
import hui
from hui import HuiThing

'''
class HuiThing:
  def __init__(self):
    self.__id__ = None

  def add(self, obj):
    if self.__id__ == None:
      raise Exception("Objekt wurde noch nicht mit hui.add(...) zum Spiel hinzugefügt.")
    return hui.add(obj, self.__id__)
'''
`;

export const GAME_PSEUDO_PREAMBLE = `#Import
import math
import random
import hui
from hui import HuiThing
`

export const ALL_GAME_PRESETS: CodePreset[] = [
  {
    name: "Leeres Spiel",
    preamble: GAME_PREAMBLE,
    pseudo: GAME_PSEUDO_PREAMBLE,
    code: `# Leeres Spiel
# setup() wird beim Spielstart ausgeführt
def setup():
  pass

# draw() wird 30-mal pro Sekunde ausgeführt
def draw(dt):
  pass`,
  },
  {
    name: "Hallo!",
    preamble: GAME_PREAMBLE,
    pseudo: GAME_PSEUDO_PREAMBLE,
    code: `# Hallo!

# setup() wird beim Spielstart ausgeführt
def setup():
  hui.bg.flood("white")
  hui.bg.font("Arial")
  hui.bg.text_size(50)
  hui.bg.no_stroke()
  
  hui.mg.font("Arial")
  hui.mg.text_size(50)
  hui.mg.stroke("white")
  hui.mg.shadow()

# draw() wird 30-mal pro Sekunde ausgeführt
def draw(dt):
  x = hui.width / 2 + math.sin(hui.time * 4) * 100
  y = hui.height / 2 + math.cos(hui.time * 3) * 100

  hui.bg.flood("rgba(255, 255, 255, 0.05)");
  hui.bg.fill("blue")
  hui.bg.circle(x , y, 10)
  
  hui.mg.clear()
  hui.mg.text("Hallo!", x - 38, y)`
  },
  {
    name: "Hüpfender Ball",
    preamble: GAME_PREAMBLE,
    pseudo: GAME_PSEUDO_PREAMBLE,
    code: `# Hüpfender Ball
gravity = 10
ball_radius = 50
body = hui.new_body(hui.width / 2, hui.height / 2, 0, 0)
score = 0

# setup() wird beim Spielstart ausgeführt
def setup():
  hui.bg.flood("lightgreen")

  hui.ui.no_stroke()
  hui.ui.shadow()
  hui.ui.text_size(30)

  hui.mg.shadow()

# draw() wird 30-mal pro Sekunde ausgeführt
def draw(dt):
  global score
  
  hui.bg.flood("lightblue")
  mg = hui.mg # Hol dir die Hauptzeichenebene (middle ground)

  # Wir zeichnen den roten Kreis
  mg.clear()
  mg.fill("lightcoral")
  mg.stroke("white")
  mg.thick(5)
  mg.circle(
    body.x, 
    body.y, 
    ball_radius
  )

  # Gravitation
  body.vy += gravity

  # Bei Klick springt der Ball nach oben und ein Sound wird abgespielt
  dist = hui.mouse.to(body.pos)
  if hui.just_pressed("m0") and dist.len() < 50:
      hui.sound.bleep(250, 1.0)
      body.vy = -500
      body.vx = dist.x * 20

      score += 1

  # Wir bewegen den Körper
  body.move(dt)

  # Hat der Ball den Boden berührt? Dann soll er abprallen!
  if (body.y > hui.height - ball_radius):
    body.y = hui.height - ball_radius
    body.vy = -body.vy * 0.9
    hui.sound.boop(abs(body.vy), 0.5)
    score = 0

  # Der Ball hat den Bildschirm verlassen? Punkte und Ball zurücksetzen!
  if (body.x < -ball_radius or body.x > hui.width + ball_radius):
    hui.sound.psh(1000, 1.0)
    body.x = hui.width / 2
    body.y = 0
    body.vx = 0
    body.vy = 0
    score = 0
    

  # Punktestand anzeigen
  hui.ui.clear();
  hui.ui.text(f"Punkte: {score}", hui.width / 2, 20)`,
  },
  {
    name: "Smiley",
    preamble: GAME_PREAMBLE,
    pseudo: GAME_PSEUDO_PREAMBLE,
    code: `# Smiley
sprite = hui.new_sprite(70, 70)
sprite.fill("yellow")
sprite.circle(0, 0, 25)
sprite.fill("black")
sprite.circle(-10, -7, 3)
sprite.circle(10, -7, 3)
sprite.move(0, 10)
sprite.rotate(-math.pi / 2)
sprite.text("(", 0, 0)

# setup() wird beim Spielstart ausgeführt
def setup():
  hui.bg.flood("lightblue")
  hui.mg.shadow()

# draw() wird 30-mal pro Sekunde ausgeführt
def draw(dt):
  hui.mg.clear()
  hui.mg.show(sprite, hui.mx, hui.my - 30)`
  },
  {
    name: "Bilder importieren",
    preamble: GAME_PREAMBLE,
    pseudo: GAME_PSEUDO_PREAMBLE,
    code: `# Bilder importieren
snake = hui.new_image("https://img.icons8.com/?size=48&id=OwPRfsLEUW71&format=png")
snake_body = hui.new_body(hui.width/2, hui.height/2, 0, 0)

# setup() wird beim Spielstart ausgeführt
def setup():
  hui.bg.flood("lightgreen")
  hui.mg.shadow();

# draw() wird 30-mal pro Sekunde ausgeführt
def draw(dt):
  # Schlange auf Maus zubewegen
  snake_body.vel = hui.lerp(
    snake_body.vel,
    snake_body.pos.dirTo(hui.mouse).scale(100), 
    0.2
  )
  snake_body.move(dt)
  
  # Schlange anzeigen
  hui.mg.clear()
  hui.mg.show(snake, snake_body.x, snake_body.y)`
  },
  {
    name: "Scene Tree Test",
    preamble: GAME_PREAMBLE,
    pseudo: GAME_PSEUDO_PREAMBLE,
    code: `# Scene tree test
class Test(HuiThing):
  def setup(self):
    self.timer = self.add(hui.new_timer(4))
    self.timer.start()

  def tick(self, dt):
    # print(self.timer.time)
    if self.timer.just_finished:
      hui.remove(self)

  def draw(self, dt):
    hui.mg.fill("red")
    hui.mg.circle(0, 0, 100)

test = hui.add(Test())

# setup() wird beim Spielstart ausgeführt
def setup():
  hui.bg.flood("lightblue")

# draw() wird 30-mal pro Sekunde ausgeführt
def draw(dt):
  hui.mg.clear()`
  },
  {
    name: "Collision Test",
    preamble: GAME_PREAMBLE,
    pseudo: GAME_PSEUDO_PREAMBLE,
    code: `# Collision Test
from hui import width, height, bg, ui

g = hui.new_box(width /2, height - 50, 400, 20)
g.static = True

b = hui.new_box(width /2, height/2, 100, 70)
b.angle = 0.4
b.gravity = 500

hui.debug(True)
hui.add(g)
hui.add(b)

# setup() wird beim Spielstart ausgeführt
def setup():
  bg.flood("lightblue")

# draw() wird 30-mal pro Sekunde ausgeführt
def draw(dt):
  ui.clear()`
  },
  {
    name: "Planck.js Test",
    preamble: GAME_PREAMBLE,
    pseudo: GAME_PSEUDO_PREAMBLE,
    code: `# Collision Test
from hui import width, height, bg, ui, physics
hui.debug(True)

g = physics.add_box(width /2, height - 50, 400, 20, "static")
b = physics.add_box(width /2, height/2, 100, 70, "dynamic")

hui.add(g)
hui.add(b)

# setup() wird beim Spielstart ausgeführt
def setup():
  bg.flood("lightblue")

def tick(dt):
  b.apply_force(5, 0)

# draw() wird 30-mal pro Sekunde ausgeführt
def draw(dt):
  ui.clear()`
  }
]