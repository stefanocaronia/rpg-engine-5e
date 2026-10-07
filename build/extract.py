# Extracts the SRD 5.1 PDF as text in reading order: for each page the left column, then the right one; lines rebuilt from word positions.
import sys, pathlib, pdfplumber
source, target = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
out = []
with pdfplumber.open(source) as pdf:
    for number, page in enumerate(pdf.pages, start=1):
        middle = page.width / 2
        words = page.extract_words(keep_blank_chars=False, use_text_flow=False, x_tolerance=1.5, y_tolerance=2)
        columns = ([w for w in words if w["x0"] < middle - 5], [w for w in words if w["x0"] >= middle - 5])
        out.append(f"=== page {number}")
        for column in columns:
            rows = {}
            for w in column:
                key = round(w["top"] / 3)
                rows.setdefault(key, []).append(w)
            for key in sorted(rows):
                out.append(" ".join(w["text"] for w in sorted(rows[key], key=lambda w: w["x0"])))
target.write_text("\n".join(out), encoding="utf-8")
