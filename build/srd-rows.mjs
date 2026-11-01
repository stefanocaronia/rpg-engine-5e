// The rows of the SRD 5.1's PDF that pdf.py writes, as spells.mjs and monsters.mjs read them: each with its page, column, left edge, size, font, text, and
// the style of each character.
import { readFileSync } from "node:fs";

/** The rows of pdf.py's file in reading order, without the footer of each page. */
export function readRows(path)
{
    return readFileSync(path, "utf8").split("\n").filter((text) => text !== "").map((text) => JSON.parse(text))
        .filter((row) => row.text !== undefined && !/^System Reference Document 5\.1 \d+$/.test(row.text));
}
