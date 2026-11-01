# Extracts the SRD 5.1 PDF for every converter, in one file: python -I build/pdf.py <SRD_CC_v5.1.pdf> <srd51.jsonl>. A JSON line for each line of text, in
# reading order: for each page the left column, then the right one. Two views of each column, as the converters read them:
# - rows, for spells.mjs and monsters.mjs: the words whose tops round to the same third of a point, with the row's page, column, left edge, largest font
#   size, first font, text, and the style of each character (r regular, i italic, b bold, x bold italic);
# - lines, for srd-markdown.mjs: the words whose tops are within 3 pt of the line's first, as a bullet the PDF sets a little lower than its text, each word
#   split where its font changes, with its left and right edges, font and size.
import json, sys, pathlib, pdfplumber
from pdfplumber.utils.text import LIGATURES

source, target = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])


def style(char):
    # A few commas of the stat blocks are in ScalaSansOffc-BoldIta.
    font = char["fontname"].split("+")[-1]
    bold, italic = "Bold" in font, "Ita" in font
    return "x" if bold and italic else "b" if bold else "i" if italic else "r"


def word_styles(word):
    return "".join(style(char) * len(LIGATURES.get(char["text"], char["text"])) for char in word["chars"])


def columns(page, words):
    middle = page.width / 2
    return ([w for w in words if w["x0"] < middle - 5], [w for w in words if w["x0"] >= middle - 5])


def rows_of(number, index, column):
    rows = {}
    for w in column:
        rows.setdefault(round(w["top"] / 3), []).append(w)
    for key in sorted(rows):
        row = sorted(rows[key], key=lambda w: w["x0"])
        text = " ".join(w["text"] for w in row)
        styles = " ".join(word_styles(w) for w in row)
        if len(styles) != len(text):
            raise ValueError(f"page {number}: the styles of a line do not match its text: {text}")
        first = row[0]["chars"][0]
        size = max(char["size"] for w in row for char in w["chars"])
        yield {"page": number, "column": index, "x": round(row[0]["x0"], 1), "size": round(size, 1), "font": first["fontname"].split("+")[-1], "text": text, "styles": styles}


def lines_of(number, index, column):
    rows = []
    for w in sorted(column, key=lambda w: w["top"]):
        if rows and w["top"] - rows[-1][0]["top"] <= 3:
            rows[-1].append(w)
        else:
            rows.append([w])
    for row in rows:
        cells = [[w["text"], round(w["x0"], 1), round(w["x1"], 1), w["fontname"].split("+")[-1], round(w["size"], 1)] for w in sorted(row, key=lambda w: w["x0"])]
        yield {"page": number, "column": index, "top": round(row[0]["top"], 1), "words": cells}


out = []
with pdfplumber.open(source) as pdf:
    for number, page in enumerate(pdf.pages, start=1):
        options = {"keep_blank_chars": False, "use_text_flow": False, "x_tolerance": 1.5, "y_tolerance": 2}
        plain = columns(page, page.extract_words(**options, return_chars=True))
        fonts = columns(page, page.extract_words(**options, extra_attrs=["fontname", "size"]))
        for index in (0, 1):
            out.extend(rows_of(number, index, plain[index]))
            out.extend(lines_of(number, index, fonts[index]))
target.write_text("".join(json.dumps(item, ensure_ascii=False) + "\n" for item in out), encoding="utf-8")
