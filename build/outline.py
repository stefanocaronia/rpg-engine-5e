# The SRD 5.1 headings by font size, with their page: the map for splitting the rules text into chapters and sections.
import sys, pathlib, collections, pdfplumber
source, target = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
sizes = collections.Counter()
headings = []
with pdfplumber.open(source) as pdf:
    for number, page in enumerate(pdf.pages, start=1):
        lines = collections.OrderedDict()
        for char in page.chars:
            key = (round(char["top"]), char["x0"] >= page.width / 2 - 5)
            lines.setdefault(key, []).append(char)
        for (top, right), chars in lines.items():
            size = round(max(c["size"] for c in chars), 1)
            text = "".join(c["text"] for c in sorted(chars, key=lambda c: c["x0"])).strip()
            sizes[size] += len(text)
            if size >= 11.5 and text and not text.isdigit():
                headings.append((number, size, chars[0]["fontname"].split("+")[-1], text))
target.write_text("\n".join(f"{p}\t{s}\t{f}\t{t}" for p, s, f, t in headings), encoding="utf-8")
print("sizes:", sorted(sizes.items(), key=lambda item: -item[1])[:8])
print("headings:", len(headings))
