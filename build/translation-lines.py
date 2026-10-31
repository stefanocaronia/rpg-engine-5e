# Extracts a translated SRD 5.1 PDF (SRD_CC_v5.1_IT.pdf, _FR, _DE, _ES) for translations.mjs, with PyMuPDF:
# python -I build/translation-lines.py <SRD_CC_v5.1_CODE.pdf> <srd51-code.jsonl>.
# A JSON line for each line of text, in the order the PDF draws them, without the footer: page, column (0 left, 1 right), top, left edge and its spans,
# each [text, font, size, x0, x1]; then a line for each page with its shaded rectangles ("fills"), the rows of its tables; then the outline ("outline").
import json, sys, pathlib, pymupdf

source, target = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
footer = 740
out = []
with pymupdf.open(source) as pdf:
    for number, page in enumerate(pdf, start=1):
        middle = page.rect.width / 2
        for block in page.get_text("dict", sort=False)["blocks"]:
            for line in block.get("lines", []):
                x0, top = line["bbox"][0], line["bbox"][1]
                if top > footer:
                    continue
                spans = [[span["text"], span["font"], round(span["size"], 1), round(span["bbox"][0], 1), round(span["bbox"][2], 1)] for span in line["spans"]]
                out.append({"page": number, "column": 0 if x0 < middle - 5 else 1, "top": round(top, 1), "x0": round(x0, 1), "spans": spans})
        fills = [[round(v, 1) for v in drawing["rect"]] for drawing in page.get_drawings() if drawing.get("fill") is not None and drawing["rect"].height > 5]
        out.append({"page": number, "fills": fills})
    out.append({"outline": [[level, title, page] for level, title, page in pdf.get_toc()]})
target.write_text("".join(json.dumps(item, ensure_ascii=False) + "\n" for item in out), encoding="utf-8")
