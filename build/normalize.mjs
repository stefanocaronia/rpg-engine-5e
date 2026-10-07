// Cleans the text extract.py takes from the SRD 5.1 PDF into the one the converters read: node systems/5e/build/normalize.mjs <extract.py's text> <srd51-norm.txt>
// The PDF writes a hyphen as four characters, a hyphen-minus followed by a soft hyphen, a hyphen and a non-breaking hyphen (the last one missing at
// times): only the first stays. Lines end with a line feed alone, as on Windows Python writes them with a carriage return.
import { readFileSync, writeFileSync } from "node:fs";

const [source, target] = process.argv.slice(2);

if (source === undefined || target === undefined) {
    console.error("Usage: node systems/5e/build/normalize.mjs <the text extract.py wrote> <srd51-norm.txt>");
    process.exit(1);
}

writeFileSync(target, readFileSync(source, "utf8").replaceAll("\r\n", "\n").replace(/-[­‐‑]+/g, "-"));
