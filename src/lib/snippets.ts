interface CodeSnippet {
    name: string;
    insert: string;
    display?: string;
    info?: string;
    section?: string;
}

export const ALL_SNIPPETS: CodeSnippet[] = [
    {
        name: "Vorlage Daten Eingabe Messdaten",
        display: "💾 Daten: Händische Eingabe von Messdaten",
        insert: `# Eingabe von Messdaten
\${data} = np.array([
  [1, 1],
  [2, 4],
  [3, 9],
  [4, 16],
])

\${x} = \${data}[:,0]
\${y} = \${data}[:,1]

`
    },
    {
        name: "Vorlage Daten Eingabe CSV Messdaten",
        display: "💾 Daten: CSV-Daten importieren",
        insert: `# Import von CSV-Daten
data = np.array(csv_data[0][1:])
\${x} = data[:,0]
\${y} = data[:,1]

`
    },
    {
        name: "Vorlage Plot Scatterplot",
        display: "📈 Plot: Scatterplot von Daten",
        insert: `# Scatterplot erzeugen
plt.scatter(\${x}, \${y}, 
            marker = "x", 
            color = "blue")

`
    },
    {
        name: "Vorlage Plot Funktion",
        display: "📈 Plot: Beliebige Funktion",
        insert: `# Funktion zeichnen 
\${x_f} = np.linspace(\${min_x},\${max_x},100)
\${y_f} = 2 * x_f ** 2
plt.plot(\${x_f}, \${y_f}, 
        color = "green",
        label = "f(x) = 2*x^2")
plt.legend()

`
    },
    {
        name: "Vorlage Plot Lineare Regression",
        display: "📈 Plot: Linearen Regression",
        insert: `# Lineare Regression
A = np.vstack([\${x}, np.zeros(len(\${x}))]).T
m, t = np.linalg.lstsq(A, \${y})[0] # LeaST SQuares
x_fit = np.linspace(0, 5, 100)
y_fit =  m * x_fit + t

plt.plot(x_fit, y_fit, 
          color = "red", 
          linestyle = "-",
          label = f"y = {m:.3f} * x + {t:.3f}")
plt.legend()

`
    },
    {
        name: "Vorlage Diagramm Anzeigen Anpassen",
        display: "🖨️ Anzeigen: Diagramm anzeigen und anpassen",
        insert: `# Beschriftungen
plt.title("Überschrift", 
          color = "black", 
          weight = "bold")
plt.xlabel("x-Achsen Beschriftung")
plt.ylabel("y-Achsen Beschriftung")

# Achsen
plt.xlim(left = 0)
plt.ylim(bottom = 0)
plt.grid(which = 'major', linestyle = '-' , alpha = 0.8)
plt.grid(which = 'minor', linestyle = "--",  alpha = 0.5)
plt.minorticks_on()

# Erstelle Diagramm
plt.show()
`
    },
]