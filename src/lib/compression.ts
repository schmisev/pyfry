import LZString from "lz-string";

export type VersionType = null | "1";
export const zip = (decompress: boolean, version: VersionType = null, value: string): string => {
  try {
    if (!decompress) {
      switch (version) {
        case "1": return LZString.compressToBase64(value);
        default: return btoa(value);
      }
    } else {
      switch (version) {
        case "1": return LZString.decompressFromBase64(value);
        default: return atob(value);
      }
    }
  } catch (e) {
    throw e;
  }
}