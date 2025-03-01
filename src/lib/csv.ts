export type CSVData = (string | number)[][];

export function parseCSV(contents: string): CSVData {
  let txt_csv = contents
    .replace("\r", "")
    .split("\n")
    .map((v) => v.split(";"));

  txt_csv.pop();

  let csv = txt_csv.map((v) => v.map((n) => {
    let numeric = parseFloat(n);
    if (numeric !== 0 && !numeric) return n;
    return numeric;
  }));

  return csv;
}