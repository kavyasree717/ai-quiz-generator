"""PDF text extraction and lightweight concept analysis."""
from __future__ import annotations

import io
import re
from collections import Counter

from pypdf import PdfReader

# Very small English stopword set for keyword extraction (no heavy NLP deps).
_STOPWORDS = set(
    """a an the and or but if then else for to of in on at by with from as is are was were be been
    being this that these those it its it's into over under above below between not no nor so such
    can will would should could may might must shall do does did done has have had having you your
    we our they their he she his her them us i me my mine ours yours which who whom whose what when
    where why how all any both each few more most other some only own same than too very just also
    about above after again against because before during through while within without""".split()
)


def extract_text(file_bytes: bytes, max_chars: int = 24000) -> str:
    """Extract plain text from a PDF byte stream, truncated to max_chars."""
    reader = PdfReader(io.BytesIO(file_bytes))
    chunks = []
    total = 0
    for page in reader.pages:
        try:
            txt = page.extract_text() or ""
        except Exception:
            txt = ""
        txt = re.sub(r"[ \t]+", " ", txt)
        chunks.append(txt)
        total += len(txt)
        if total >= max_chars:
            break
    text = "\n".join(chunks).strip()
    return text[:max_chars]


def extract_key_concepts(text: str, top_n: int = 12) -> list[str]:
    """Return the most frequent meaningful terms as candidate key concepts."""
    words = re.findall(r"[A-Za-z][A-Za-z\-']{2,}", text.lower())
    filtered = [w for w in words if w not in _STOPWORDS and len(w) > 3]
    counts = Counter(filtered)
    return [w for w, _ in counts.most_common(top_n)]
