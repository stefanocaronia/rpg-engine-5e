# Writes the SRD 5.1 PDF's text as extract.py does, a line a row, with what the page shows of each: page, column, left edge, font size, font, text, and the
# style of each character of the text (r regular, i italic, b bold, x bold italic): python systems/5e/build/layout.py <SRD_CC_v5.1.pdf> <srd51-layout.tsv>
import sys, pathlib, pdfplumber
from pdfplumber.utils.text import LIGATURES

source, target = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])


def style(char):
    # A few commas of the stat blocks are in ScalaSansOffc-BoldIta.
    font = char["fontname"].split("+")[-1]
    bold, italic = "Bold" in font, "Ita" in font
    return "x" if bold and italic else "b" if bold else "i" if italic else "r"


def word_styles(word):
    return "".join(style(char) * len(LIGATURES.get(char["text"], char["text"])) for char in word["chars"])


out = []
with pdfplumber.open(source) as pdf:
    for number, page in enumerate(pdf.pages, start=1):
        middle = page.width / 2
        words = page.extract_words(keep_blank_chars=False, use_text_flow=False, x_tolerance=1.5, y_tolerance=2, return_chars=True)
        columns = ([w for w in words if w["x0"] < middle - 5], [w for w in words if w["x0"] >= middle - 5])
        for index, column in enumerate(columns):
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
                out.append(f"{number}\t{index}\t{row[0]['x0']:.1f}\t{size:.1f}\t{first['fontname'].split('+')[-1]}\t{text}\t{styles}")
target.write_text("\n".join(out) + "\n", encoding="utf-8")
