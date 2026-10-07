# Extracts the SRD 5.1 PDF as lines of words with their position and font, for the converters that keep its italics, indents and table columns:
# python systems/5e/build/lines.py <SRD_CC_v5.1.pdf> <srd51-lines.jsonl>. A JSON line for each line of text, in reading order: for each page the left
# column, then the right one; a line holds the words whose tops are within 3 pt of its first, as a bullet the PDF sets a little lower than its text.
import json, sys, pathlib, pdfplumber
source, target = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
out = []
with pdfplumber.open(source) as pdf:
    for number, page in enumerate(pdf.pages, start=1):
        middle = page.width / 2
        words = page.extract_words(keep_blank_chars=False, use_text_flow=False, x_tolerance=1.5, y_tolerance=2, extra_attrs=["fontname", "size"])
        for column, side in enumerate(([w for w in words if w["x0"] < middle - 5], [w for w in words if w["x0"] >= middle - 5])):
            rows = []
            for w in sorted(side, key=lambda w: w["top"]):
                if rows and w["top"] - rows[-1][0]["top"] <= 3:
                    rows[-1].append(w)
                else:
                    rows.append([w])
            for row in rows:
                cells = [[w["text"], round(w["x0"], 1), round(w["x1"], 1), w["fontname"].split("+")[-1], round(w["size"], 1)] for w in sorted(row, key=lambda w: w["x0"])]
                out.append(json.dumps({"page": number, "column": column, "top": round(row[0]["top"], 1), "words": cells}, ensure_ascii=False))
target.write_text("\n".join(out) + "\n", encoding="utf-8")
