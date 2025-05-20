export type CSVData = (string | number)[][];

export function parseCSV(contents: string): CSVData {
  let txt_csv_rows = contents
    .replace("\r", "")
    .split("\n");

  let txt_csv = txt_csv_rows.filter((v) => (v !== "")).map((v) => v.split(";"));
  txt_csv.pop();

  let csv = txt_csv.map((v) => v.map((n) => {
    let cleaned = n.replaceAll(",", ".");
    let numeric = parseFloat(cleaned);
    if (!numeric && numeric !== 0) return n;
    return numeric;
  }));

  return csv;
}