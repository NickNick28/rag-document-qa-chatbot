import os
import sys
import json
import hashlib
import logging
import asyncio
import anyio
import uuid
import datetime
import re
from typing import Optional, Dict, Any, List, Tuple

from dotenv import load_dotenv
from pydantic import TypeAdapter

# --- MCP ---
from mcp.server import Server, NotificationOptions, InitializationOptions
import mcp.types as types

# --- Starlette / SSE ---
from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Route
from sse_starlette.sse import EventSourceResponse
from starlette.requests import Request

# --- LlamaParse & LangChain ---
from llama_parse import LlamaParse
from langchain_core.documents import Document
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone

from supabase import create_client, Client


# =========================================================
# 0) Logging
# =========================================================
logging.basicConfig(level=logging.INFO, stream=sys.stdout)
logger = logging.getLogger("rag-optimized-server")


# =========================================================
# 1) Config
# =========================================================
load_dotenv()

if not os.getenv("PINECONE_API_KEY") or not os.getenv("PINECONE_INDEX_NAME"):
    logger.error("❌ Missing PINECONE_API_KEY / PINECONE_INDEX_NAME")
    sys.exit(1)

if not os.getenv("GOOGLE_API_KEY") or not os.getenv("LLAMA_CLOUD_API_KEY"):
    logger.error("❌ Missing GOOGLE_API_KEY / LLAMA_CLOUD_API_KEY")
    sys.exit(1)

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("❌ Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index_name = os.getenv("PINECONE_INDEX_NAME")

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DOCUMENTS_DIR = os.path.join(CURRENT_DIR, "documents")
os.makedirs(DOCUMENTS_DIR, exist_ok=True)

embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")
vector_store = PineconeVectorStore(
    index_name=index_name,
    embedding=embeddings,
    pinecone_api_key=os.getenv("PINECONE_API_KEY"),
)

server = Server("rag-optimized-server")

processing_status: Dict[str, str] = {}


# =========================================================
# 2) LlamaParse Builder
# =========================================================
OCR_FULLPAGE_INSTRUCTION = """
You are an OCR/transcription engine.
Extract ALL visible text, including titles, headers, footers, and notes.
Do NOT summarize or add new information.
Preserve tables and surrounding text.
Output in markdown.
""".strip()


def build_llamaparse_parser(
    *,
    result_type: str = "markdown",
    language: str = "th",
    verbose: bool = False,
    model: str = "gemini-2.5-flash",
    parse_mode: Optional[str] = "parse_page_with_agent",
    high_res_ocr: bool = True,
) -> LlamaParse:
    api_key = os.getenv("LLAMA_CLOUD_API_KEY")
    if not api_key:
        raise RuntimeError("Missing LLAMA_CLOUD_API_KEY")

    if parse_mode:
        return LlamaParse(
            api_key=api_key,
            result_type=result_type,
            language=language,
            verbose=verbose,
            model=model,
            parse_mode=parse_mode,
            high_res_ocr=high_res_ocr,
            parsing_instruction=OCR_FULLPAGE_INSTRUCTION,
            adaptive_long_table=True,
            outlined_table_extraction=True,
        )

    return LlamaParse(
        api_key=api_key,
        result_type=result_type,
        language=language,
        verbose=verbose,
        use_vendor_multimodal_model=True,
        vendor_multimodal_model_name=model,
        high_res_ocr=high_res_ocr,
    )


# =========================================================
# 3) Helpers
# =========================================================
def sha1_hex(s: str) -> str:
    return hashlib.sha1(s.encode("utf-8")).hexdigest()

def make_chunk_id(bot_id: str, filename: str, page_start: int, chunk_index: int) -> str:
    base = f"{bot_id}|{filename}|{page_start}|{chunk_index}"
    return sha1_hex(base)

def sanitize_metadata_for_pinecone(md: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for k, v in (md or {}).items():
        if v is None:
            continue
        if isinstance(v, (str, int, float, bool)):
            out[k] = v
        elif isinstance(v, list):
            out[k] = [str(x) for x in v if x is not None]
        else:
            out[k] = str(v)
    return out

def normalize_query_terms(q: str) -> List[str]:
    q = (q or "").strip()
    parts = re.findall(r"[A-Za-z0-9ก-๙]+", q)
    parts = [p for p in parts if len(p) >= 2]
    return parts[:20]

def extract_faculty_program_hints(q: str) -> List[str]:
    hints = []
    patterns = [
        r"(คณะ[ก-๙A-Za-z0-9\s]{2,40})",
        r"(สาขา[ก-๙A-Za-z0-9\s]{2,40})",
        r"(หลักสูตร[ก-๙A-Za-z0-9\s]{2,60})",
        r"(แผน\s*[ก-๙A-Za-z0-9]{1,6})",
        r"(แบบ\s*[ก-๙A-Za-z0-9]{1,6})",
    ]
    for pat in patterns:
        for m in re.findall(pat, q):
            s = re.sub(r"\s+", " ", m).strip()
            if s and s not in hints:
                hints.append(s[:60])
    return hints[:8]


# =========================================================
# 4) Printed page number detection
# =========================================================
def extract_printed_page_number(text: str) -> Optional[int]:
    search_zones = [text[:300], text[-200:]] if len(text) > 500 else [text]

    patterns = [
        r"-\s*(\d+)\s*-",
        r"หน้า\s*(\d+)",
        r"page\s*(\d+)",
        r"^\s*(\d+)\s*$",
        r"^(\d+)$",
    ]

    for zone in search_zones:
        for pat in patterns:
            m = re.search(pat, zone, re.M | re.I)
            if m:
                val = int(m.group(1))
                if 1 <= val <= 9999:
                    return val
    return None


# =========================================================
# 5) Page split
# =========================================================
def split_pages_from_llamaparse(llama_docs: list) -> List[Document]:
    pages: List[Document] = []
    for i, d in enumerate(llama_docs, start=1):
        text = getattr(d, "text", "") or ""
        md = getattr(d, "metadata", None) or {}

        file_page = md.get("page_no") or md.get("page_number") or md.get("page") or i
        try:
            file_page = int(file_page)
        except Exception:
            file_page = i

        printed_page = extract_printed_page_number(text)

        if printed_page:
            logger.info(f"📄 หน้าในไฟล์ {file_page} → เลขหน้าต้นฉบับ {printed_page}")

        pages.append(Document(
            page_content=text,
            metadata={
                **md,
                "page_no": file_page,
                "printed_page": printed_page,
            },
        ))

    pages.sort(key=lambda x: int((x.metadata or {}).get("page_no", 0)))
    return pages


# =========================================================
# 6) Table helpers
# =========================================================
def looks_like_md_table(text: str) -> bool:
    if re.search(r"^\s*\|.+\|\s*$", text, re.M):
        if re.search(r"^\s*\|?\s*:?-{2,}\s*\|", text, re.M):
            return True
    lines = [l for l in text.splitlines() if l.strip()]
    if len(lines) >= 3:
        pipe_lines = sum(1 for l in lines if l.count("|") >= 3)
        if pipe_lines / max(len(lines), 1) >= 0.4:
            return True
    return text.count("|") >= 10


def clean_malformed_table(text: str) -> str:
    lines = text.splitlines()
    cleaned = []
    for line in lines:
        if "|" not in line:
            stripped = line.strip()
            if stripped:
                cleaned.append(line)
            continue
        cells = [c.strip() for c in line.split("|")]
        non_empty = [c for c in cells if c and c.strip("-").strip(":").strip()]
        if len(non_empty) < 2:
            if non_empty and len(non_empty[0]) > 3:
                cleaned.append(f"\n**{non_empty[0]}**")
        else:
            cleaned.append(line)
    return "\n".join(cleaned)


def reconstruct_flat_table(text: str) -> str:
    lines = [l.rstrip() for l in text.splitlines() if l.strip()]
    if not lines:
        return text
    has_sep = any(re.search(r"-{2,}", l) and "|" in l for l in lines)
    if has_sep:
        return clean_malformed_table(text)

    result = []
    header_inserted = False
    last_col_count = 0

    for line in lines:
        if "|" not in line:
            stripped = line.strip()
            if stripped:
                result.append(f"\n**{stripped}**\n")
            header_inserted = False
            continue
        cells = [c.strip() for c in line.split("|")]
        cells = [c for c in cells if c != ""]
        if not cells:
            continue
        col_count = len(cells)
        if last_col_count > 0 and abs(col_count - last_col_count) > 2:
            header_inserted = False
        row = "| " + " | ".join(cells) + " |"
        if not header_inserted:
            sep = "| " + " | ".join(["---"] * col_count) + " |"
            result.append(row)
            result.append(sep)
            header_inserted = True
        else:
            result.append(row)
        last_col_count = col_count

    return "\n".join(result)


# =========================================================
# 7) Section/Plan context propagation
# =========================================================
PLAN_PATTERNS = [
    r"(แผน\s*[กขคง]\s*(?:แบบ\s*[กขคง]\d*)?)",
    r"(แผน\s*\d+\s*ว\.?\s*\d*)",
    r"(ภาคปกติ|ภาคพิเศษ|ภาคนอกเวลา)",
    r"(จัดการศึกษา[ก-๙A-Za-z0-9\s\(\)\/]{5,80})",
    r"(ระดับปริญญา(?:โท|เอก|ตรี)[ก-๙A-Za-z0-9\s\(\)\/]{0,60})",
]

GROUP_PATTERNS = [
    r"(กลุ่ม[ก-๙A-Za-z0-9\s]{3,40})",
]

def extract_active_plans(text: str) -> List[str]:
    plans = []
    for pat in PLAN_PATTERNS:
        for m in re.findall(pat, text):
            s = re.sub(r"\s+", " ", m).strip()
            if s and s not in plans:
                plans.append(s[:80])
    return plans[:5]

def extract_active_groups(text: str) -> List[str]:
    groups = []
    for pat in GROUP_PATTERNS:
        for m in re.findall(pat, text):
            s = re.sub(r"\s+", " ", m).strip()
            if s and s not in groups:
                groups.append(s[:60])
    return groups[:3]

def propagate_context_across_pages(pages: List[Document]) -> List[Document]:
    active_plans: List[str] = []
    active_groups: List[str] = []
    result = []
    for pg in pages:
        text = pg.page_content or ""
        found_plans = extract_active_plans(text)
        found_groups = extract_active_groups(text)
        if found_plans:
            active_plans = found_plans
        if found_groups:
            active_groups = found_groups
        new_md = {**(pg.metadata or {})}
        if active_plans:
            new_md["active_plans"] = active_plans
        if active_groups:
            new_md["active_groups"] = active_groups
        result.append(Document(page_content=text, metadata=new_md))
    return result


# =========================================================
# 8) Chunking helpers
# =========================================================
def chunk_table_keep_header(
    table_md: str, rows_per_chunk: int = 25, overlap_rows: int = 3
) -> List[str]:
    lines = [ln.rstrip() for ln in (table_md or "").splitlines() if ln.strip() != ""]
    if len(lines) < 3:
        return [table_md]

    sep_idx = None
    for i in range(min(10, len(lines))):
        if re.search(r":?-{2,}", lines[i]) and "|" in lines[i]:
            sep_idx = i
            break

    if sep_idx is None:
        return [table_md]

    header_block = "\n".join(lines[:sep_idx + 1])
    body = lines[sep_idx + 1:]

    if not body:
        return [table_md]

    chunks = []
    start = 0
    while start < len(body):
        end = min(len(body), start + rows_per_chunk)
        chunk_text = header_block + "\n" + "\n".join(body[start:end])
        chunks.append(chunk_text)
        if end == len(body):
            break
        start = max(0, end - overlap_rows)

    return chunks if chunks else [table_md]


def split_table_by_faculty(table_md: str) -> List[str]:
    lines = table_md.splitlines()

    sep_idx = None
    for i, ln in enumerate(lines):
        if re.search(r":?-{2,}", ln) and "|" in ln:
            sep_idx = i
            break

    if sep_idx is None:
        return [table_md]

    header_block = "\n".join(lines[:sep_idx + 1])
    body = lines[sep_idx + 1:]

    section_start_pattern = re.compile(
        r"(\*\*กลุ่ม"
        r"|\*\*\d+\.\s*คณะ"
        r"|^\s*กลุ่ม[ก-๙A-Za-z]"
        r"|^\s*\d+\.\s*คณะ"
        r")",
        re.M,
    )

    sections: List[List[str]] = []
    current: List[str] = []

    for line in body:
        is_new = bool(section_start_pattern.search(line))
        if is_new and current:
            data_rows = [l for l in current if "|" in l and not re.search(r":?-{2,}", l)]
            if data_rows:
                sections.append(current)
            current = [line]
        else:
            current.append(line)

    if current:
        data_rows = [l for l in current if "|" in l and not re.search(r":?-{2,}", l)]
        if data_rows:
            sections.append(current)

    if len(sections) <= 1:
        return [table_md]

    result = []
    for sec in sections:
        chunk = header_block + "\n" + "\n".join(sec)
        result.append(chunk)

    logger.info(f"✂️ split_table_by_faculty: แยกได้ {len(result)} sections")
    return result


def chunk_text_recursive(text: str, chunk_size: int = 1600, chunk_overlap: int = 200) -> List[str]:
    splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    return splitter.split_text(text)

def extract_section_hint(text: str) -> str:
    lines = [ln.strip() for ln in (text or "").splitlines() if ln.strip()]
    for ln in lines[:25]:
        if re.match(r"^(\d+(\.\d+){0,3})\s*[\.\)]?\s+.+", ln):
            return ln[:120]
        if ln.startswith("คณะ") or ln.startswith("หลักสูตร") or ln.startswith("สาขา"):
            return ln[:120]
    return ""


def stitch_table_pages(pages: List[Document]) -> List[Document]:
    out: List[Document] = []
    i = 0
    while i < len(pages):
        cur = pages[i]
        cur_text = (cur.page_content or "").strip()
        cur_no = int((cur.metadata or {}).get("page_no", i + 1))
        cur_printed = (cur.metadata or {}).get("printed_page")

        if looks_like_md_table(cur_text):
            merged_text = cur_text
            merged_end = cur_no
            merged_printed_end = cur_printed
            j = i + 1

            while j < len(pages):
                nxt_text = (pages[j].page_content or "").strip()
                nxt_no = int((pages[j].metadata or {}).get("page_no", j + 1))
                nxt_printed = (pages[j].metadata or {}).get("printed_page")

                if looks_like_md_table(nxt_text):
                    merged_text += "\n\n" + nxt_text
                    merged_end = nxt_no
                    if nxt_printed:
                        merged_printed_end = nxt_printed
                    j += 1
                else:
                    break

            if j > i + 1:
                logger.info(f"📎 stitch หน้า {cur_no}–{merged_end} ({j - i} หน้า)")

            md = {**(cur.metadata or {})}
            md["page_no"] = cur_no
            md["page_end"] = merged_end
            if cur_printed:
                md["printed_page_start"] = cur_printed
            if merged_printed_end:
                md["printed_page_end"] = merged_printed_end

            out.append(Document(page_content=merged_text, metadata=md))
            i = j
            continue

        md = {**(cur.metadata or {})}
        md["page_no"] = cur_no
        md["page_end"] = cur_no
        if cur_printed:
            md["printed_page_start"] = cur_printed
            md["printed_page_end"] = cur_printed
        out.append(Document(page_content=cur_text, metadata=md))
        i += 1

    return out


def format_page_ref(
    page_start: Any,
    page_end: Any,
    printed_start: Any,
    printed_end: Any,
) -> str:
    ps_p = printed_start or printed_end
    pe_p = printed_end or printed_start
    if ps_p:
        ps = int(ps_p)
        pe = int(pe_p)
        return f"หน้า {ps}" if ps == pe else f"หน้า {ps}-{pe}"
    else:
        ps = page_start
        pe = page_end if page_end else ps
        if not ps:
            return ""
        if ps == pe:
            return f"หน้า {ps} (ในไฟล์)"
        return f"หน้า {ps}-{pe} (ในไฟล์)"


# =========================================================
# 9) Supabase document helpers
# =========================================================
def get_or_create_document_id(bot_id: str, filename: str) -> int:
    res = (
        supabase.table("documents")
        .select("id")
        .eq("bot_id", bot_id)
        .eq("filename", filename)
        .execute()
    )
    if res.data:
        return int(res.data[0]["id"])
    ins = supabase.table("documents").insert({"bot_id": bot_id, "filename": filename}).execute()
    return int(ins.data[0]["id"])

def delete_existing_doc_data(bot_id: str, filename: str, document_id: int):
    try:
        supabase.table("document_chunks").delete().eq("document_id", document_id).execute()
    except Exception as e:
        logger.warning(f"⚠️ Failed deleting old chunks from DB: {e}")
    try:
        index = pc.Index(index_name)
        index.delete(filter={"bot_id": {"$eq": bot_id}, "source": {"$eq": filename}})
    except Exception as e:
        logger.warning(f"⚠️ Failed deleting old vectors from Pinecone: {e}")


# =========================================================
# 10) Background ingest task
# =========================================================
async def _background_ingest_task(target_path: str, filename: str, bot_id: str):
    task_key = f"{bot_id}:{filename}"
    try:
        upload_date = datetime.datetime.now().strftime("%Y-%m-%d")
        current_year_ce = datetime.datetime.now().year
        doc_year = current_year_ce + 543

        m = re.search(r"\d{4}", filename)
        if m:
            found = int(m.group())
            if found < 2500:
                doc_year = found + 543
            else:
                doc_year = found

        processing_status[task_key] = "Processing: Parsing with LlamaParse..."
        logger.info(f"⏳ [Background] Started: {task_key}")

        parser = build_llamaparse_parser(
            result_type="markdown",
            language="th",
            verbose=False,
            model="gemini-2.5-flash",
            parse_mode="parse_page_with_agent",
            high_res_ocr=True,
        )
        llama_docs = await parser.aload_data(target_path)

        if not llama_docs:
            logger.warning(f"⚠️ Agent empty → fallback multimodal: {filename}")
            parser = build_llamaparse_parser(
                result_type="markdown",
                language="th",
                verbose=False,
                model="gemini-2.5-flash",
                parse_mode=None,
                high_res_ocr=True,
            )
            llama_docs = await parser.aload_data(target_path)

        if not llama_docs:
            processing_status[task_key] = "Error: LlamaParse returned empty."
            return

        processing_status[task_key] = "Processing: Preparing pages..."
        pages = split_pages_from_llamaparse(llama_docs)

        for p in pages:
            p.metadata = {
                **(p.metadata or {}),
                "source": filename,
                "bot_id": bot_id,
                "upload_date": upload_date,
                "doc_year": int(doc_year),
            }

        stitched = stitch_table_pages(pages)
        stitched = propagate_context_across_pages(stitched)

        processing_status[task_key] = "Processing: Chunking (table-aware)..."
        splits: List[Document] = []
        chunk_index = 0

        for pg in stitched:
            md0 = pg.metadata or {}
            page_start = int(md0.get("page_no", 1))
            page_end = int(md0.get("page_end", page_start))
            printed_start = md0.get("printed_page_start") or md0.get("printed_page")
            printed_end = md0.get("printed_page_end") or printed_start

            text = (pg.page_content or "").strip()
            if not text:
                continue

            section_hint = extract_section_hint(text)
            active_plans: List[str] = md0.get("active_plans", [])
            active_groups: List[str] = md0.get("active_groups", [])

            if looks_like_md_table(text):
                text = reconstruct_flat_table(text)

                plan_prefix = ""
                if active_plans or active_groups:
                    parts = []
                    if active_groups:
                        parts.append("กลุ่ม: " + ", ".join(active_groups))
                    if active_plans:
                        parts.append("แผน: " + ", ".join(active_plans))
                    plan_prefix = "<!-- " + " | ".join(parts) + " -->\n"

                faculty_sections = split_table_by_faculty(text)

                if len(faculty_sections) > 1:
                    for sec_text in faculty_sections:
                        table_chunks = chunk_table_keep_header(
                            sec_text, rows_per_chunk=20, overlap_rows=3
                        )
                        for t in table_chunks:
                            final_text = plan_prefix + t
                            md = {
                                **md0,
                                "page_start": page_start,
                                "page_end": page_end,
                                "printed_page_start": printed_start,
                                "printed_page_end": printed_end,
                                "chunk_type": "table",
                                "section_hint": section_hint,
                                "active_plans": active_plans,
                                "active_groups": active_groups,
                            }
                            md["chunk_id"] = make_chunk_id(bot_id, filename, page_start, chunk_index)
                            md = sanitize_metadata_for_pinecone(md)
                            splits.append(Document(page_content=final_text, metadata=md))
                            chunk_index += 1
                else:
                    table_chunks = chunk_table_keep_header(
                        text, rows_per_chunk=25, overlap_rows=3
                    )
                    for t in table_chunks:
                        final_text = plan_prefix + t
                        md = {
                            **md0,
                            "page_start": page_start,
                            "page_end": page_end,
                            "printed_page_start": printed_start,
                            "printed_page_end": printed_end,
                            "chunk_type": "table",
                            "section_hint": section_hint,
                            "active_plans": active_plans,
                            "active_groups": active_groups,
                        }
                        md["chunk_id"] = make_chunk_id(bot_id, filename, page_start, chunk_index)
                        md = sanitize_metadata_for_pinecone(md)
                        splits.append(Document(page_content=final_text, metadata=md))
                        chunk_index += 1
            else:
                txt_chunks = chunk_text_recursive(text, chunk_size=1600, chunk_overlap=200)
                for t in txt_chunks:
                    md = {
                        **md0,
                        "page_start": page_start,
                        "page_end": page_end,
                        "printed_page_start": printed_start,
                        "printed_page_end": printed_end,
                        "chunk_type": "text",
                        "section_hint": section_hint,
                        "active_plans": active_plans,
                        "active_groups": active_groups,
                    }
                    md["chunk_id"] = make_chunk_id(bot_id, filename, page_start, chunk_index)
                    md = sanitize_metadata_for_pinecone(md)
                    splits.append(Document(page_content=t, metadata=md))
                    chunk_index += 1

        if not splits:
            processing_status[task_key] = "Error: No text chunks created."
            return

        processing_status[task_key] = "Processing: Saving chunks to DB..."
        document_id = get_or_create_document_id(bot_id, filename)
        delete_existing_doc_data(bot_id, filename, document_id)

        try:
            chunks_data = []
            for idx, d in enumerate(splits):
                md = d.metadata or {}
                chunks_data.append({
                    "document_id": document_id,
                    "bot_id": bot_id,
                    "chunk_index": idx,
                    "content": d.page_content,
                    "token_count": len(d.page_content) // 4,
                    "chunk_id": md.get("chunk_id"),
                    "doc_year": md.get("doc_year"),
                    "page_start": md.get("page_start"),
                    "page_end": md.get("page_end"),
                    "printed_page_start": md.get("printed_page_start"),
                    "printed_page_end": md.get("printed_page_end"),
                    "chunk_type": md.get("chunk_type"),
                    "section_hint": md.get("section_hint"),
                    "source": md.get("source"),
                    "active_plans": json.dumps(md.get("active_plans") or [], ensure_ascii=False),
                    "active_groups": json.dumps(md.get("active_groups") or [], ensure_ascii=False),
                })
            supabase.table("document_chunks").insert(chunks_data).execute()
            logger.info(f"✅ [Supabase] Saved {len(chunks_data)} chunks: {filename}")
        except Exception as e:
            logger.error(f"❌ Supabase insert failed: {e}", exc_info=True)

        processing_status[task_key] = "Processing: Saving to Pinecone..."
        try:
            ids = [(d.metadata or {}).get("chunk_id") for d in splits]
            ids = [i for i in ids if i]
            await asyncio.to_thread(vector_store.add_documents, documents=splits, ids=ids)
        except TypeError:
            await asyncio.to_thread(vector_store.add_documents, documents=splits)

        processing_status[task_key] = f"Completed ({len(splits)} chunks)"
        logger.info(f"✅ [Background] Finished: {task_key}")

    except Exception as e:
        processing_status[task_key] = f"Error: {str(e)}"
        logger.error(f"💥 [Background] Failed {task_key}: {e}", exc_info=True)
    finally:
        if os.path.exists(target_path):
            try:
                os.remove(target_path)
            except OSError:
                pass


# =========================================================
# 11) Retrieval: Hybrid parallel + rerank
# =========================================================

# ---------------------------------------------------------
# ✅ แก้ไข: keyword_search_supabase ใช้ FTS แทน ilike
# ---------------------------------------------------------
def keyword_search_supabase(
    bot_id: str, query: str, year: Optional[int], limit: int = 20
) -> List[Dict[str, Any]]:
    """
    ใช้ PostgreSQL Full-Text Search (tsv column + GIN index) แทน ilike
    เร็วกว่า ilike มาก โดยเฉพาะเมื่อ chunk เยอะ

    Fallback: ถ้า FTS ไม่มี result (เช่น tsv column ยังไม่ถูก build)
    จะ fallback ไปใช้ ilike เหมือนเดิมเพื่อความปลอดภัย
    """
    terms = normalize_query_terms(query)
    if not terms:
        return []

    # สร้าง tsquery: แต่ละ term ต่อด้วย | (OR) เพื่อให้ recall สูง
    # ใช้ :* เพื่อ prefix matching (เช่น "วิศว" match "วิศวกรรม")
    tsquery = " | ".join(f"{t}:*" for t in terms[:6])

    try:
        q = (
            supabase.table("document_chunks")
            .select(
                "chunk_id,source,doc_year,page_start,page_end,"
                "printed_page_start,printed_page_end,chunk_type,"
                "section_hint,active_plans,active_groups,content"
            )
            .eq("bot_id", bot_id)
            # ใช้ textSearch แทน ilike — ต้องการ tsv column + GIN index
            .text_search("tsv", tsquery, config="simple")
            .limit(limit)
        )
        if year is not None:
            q = q.eq("doc_year", int(year))

        res = q.execute()
        rows = res.data or []

        # ถ้า FTS คืนผลแล้ว return เลย
        if rows:
            logger.info(f"🔍 FTS keyword search: {len(rows)} results for '{query}'")
            return rows

        # FTS ได้ผลว่าง → อาจเป็นเพราะ tsv ยังไม่มีข้อมูล → fallback ilike
        logger.warning("⚠️ FTS returned 0 results, falling back to ilike")

    except Exception as e:
        # ถ้า FTS error (เช่น column ยังไม่มี) → fallback ilike
        logger.warning(f"⚠️ FTS failed ({e}), falling back to ilike")

    # --- Fallback: ilike เหมือนเดิม ---
    return _keyword_search_ilike(bot_id, query, year, limit)


def _keyword_search_ilike(
    bot_id: str, query: str, year: Optional[int], limit: int = 20
) -> List[Dict[str, Any]]:
    """Fallback keyword search ด้วย ilike (ของเดิม)"""
    terms = normalize_query_terms(query)
    if not terms:
        return []
    or_parts = [f"content.ilike.%{t}%" for t in terms[:6]]
    or_expr = ",".join(or_parts)
    q = (
        supabase.table("document_chunks")
        .select(
            "chunk_id,source,doc_year,page_start,page_end,"
            "printed_page_start,printed_page_end,chunk_type,"
            "section_hint,active_plans,active_groups,content"
        )
        .eq("bot_id", bot_id)
        .or_(or_expr)
        .limit(limit)
    )
    if year is not None:
        q = q.eq("doc_year", int(year))
    res = q.execute()
    logger.info(f"🔍 ilike fallback: {len(res.data or [])} results for '{query}'")
    return res.data or []
# ---------------------------------------------------------


def score_overlap(query: str, text: str) -> float:
    terms = normalize_query_terms(query)
    if not terms:
        return 0.0
    t = (text or "").lower()
    hit = sum(1 for w in terms if w.lower() in t)
    return hit / max(1, len(terms))

def compact_table_to_relevant_rows(table_md: str, query: str, max_rows: int = 12) -> str:
    lines = [ln.rstrip() for ln in (table_md or "").splitlines() if ln.strip()]
    if len(lines) < 3:
        return table_md

    prefix_lines = []
    content_lines = []
    for ln in lines:
        if ln.startswith("<!--") and "-->" in ln:
            prefix_lines.append(ln)
        else:
            content_lines.append(ln)

    if len(content_lines) < 3:
        return table_md

    sep_idx = None
    for i, ln in enumerate(content_lines):
        if re.search(r":?-{2,}", ln) and "|" in ln:
            sep_idx = i
            break

    if sep_idx is None:
        return table_md

    header_block = content_lines[:sep_idx + 1]
    body = content_lines[sep_idx + 1:]

    terms = normalize_query_terms(query)
    if not terms:
        return "\n".join(prefix_lines + header_block + body[:max_rows])

    picked = []
    for row in body:
        low = row.lower()
        if any(t.lower() in low for t in terms):
            picked.append(row)
        if len(picked) >= max_rows:
            break

    if not picked:
        picked = body[:max_rows]

    return "\n".join(prefix_lines + header_block + picked)


async def query_knowledge_base(query: str, bot_id: str = "general", year: int = None, top_k: int = 8) -> str:
    logger.info(f"🔎 query_knowledge_base | bot_id={bot_id} | year={year} | q={query}")

    if not query or not query.strip():
        return json.dumps(
            {
                "query": query, "bot_id": bot_id, "year": year,
                "results": [], "context": "",
                "error": "query must not be empty — please provide a search term.",
            },
            ensure_ascii=False,
        )

    filter_condition: Dict[str, Any] = {"bot_id": bot_id}
    if year is not None:
        filter_condition["doc_year"] = int(year)

    def _vector_search():
        try:
            return vector_store.similarity_search_with_score(query, k=12, filter=filter_condition)
        except Exception:
            docs = vector_store.similarity_search(query, k=10, filter=filter_condition)
            return [(d, 0.5) for d in docs]

    def _keyword_search():
        return keyword_search_supabase(bot_id, query, year, limit=20)

    vec_docs, kw = await asyncio.gather(
        asyncio.to_thread(_vector_search),
        asyncio.to_thread(_keyword_search),
    )

    merged: Dict[str, Dict[str, Any]] = {}

    for d, sc in vec_docs:
        md = d.metadata or {}
        cid = md.get("chunk_id") or md.get("id") or ""
        if not cid:
            ps = int(md.get("page_start") or md.get("page_no") or 1)
            cid = make_chunk_id(bot_id, md.get("source", "unknown"), ps, 0)
        merged[cid] = {
            "chunk_id": cid,
            "source": md.get("source"),
            "doc_year": md.get("doc_year"),
            "page_start": md.get("page_start") or md.get("page_no"),
            "page_end": md.get("page_end") or md.get("page_start") or md.get("page_no"),
            "printed_page_start": md.get("printed_page_start"),
            "printed_page_end": md.get("printed_page_end"),
            "chunk_type": md.get("chunk_type", "text"),
            "section_hint": md.get("section_hint", ""),
            "active_plans": md.get("active_plans", []),
            "active_groups": md.get("active_groups", []),
            "vector_score": float(sc),
            "keyword_score": 0.0,
            "content": d.page_content or "",
        }

    for row in kw:
        cid = row.get("chunk_id")
        if not cid:
            continue
        raw_plans = row.get("active_plans") or "[]"
        raw_groups = row.get("active_groups") or "[]"
        try:
            plans = json.loads(raw_plans) if isinstance(raw_plans, str) else raw_plans
            groups = json.loads(raw_groups) if isinstance(raw_groups, str) else raw_groups
        except Exception:
            plans, groups = [], []

        if cid not in merged:
            merged[cid] = {
                "chunk_id": cid,
                "source": row.get("source"),
                "doc_year": row.get("doc_year"),
                "page_start": row.get("page_start"),
                "page_end": row.get("page_end"),
                "printed_page_start": row.get("printed_page_start"),
                "printed_page_end": row.get("printed_page_end"),
                "chunk_type": row.get("chunk_type") or "text",
                "section_hint": row.get("section_hint") or "",
                "active_plans": plans,
                "active_groups": groups,
                "vector_score": 0.0,
                "keyword_score": 0.0,
                "content": row.get("content") or "",
            }
        merged[cid]["keyword_score"] = max(
            merged[cid].get("keyword_score", 0.0),
            score_overlap(query, row.get("content") or ""),
        )

    hints = extract_faculty_program_hints(query)
    items = list(merged.values())
    for it in items:
        text = (it.get("content") or "")
        boost = 0.0
        if hints:
            low = text.lower()
            hit_hint = sum(1 for h in hints if h.lower() in low)
            boost = 0.10 * hit_hint
        it["hybrid_score"] = (
            0.65 * float(it.get("vector_score", 0.0))
            + 0.35 * float(it.get("keyword_score", 0.0))
            + boost
        )
    items.sort(key=lambda x: float(x.get("hybrid_score", 0.0)), reverse=True)

    final = []
    for it in items[:max(10, top_k * 2)]:
        content = it.get("content") or ""
        if it.get("chunk_type") == "table" or looks_like_md_table(content):
            content = compact_table_to_relevant_rows(content, query, max_rows=12)
            it["chunk_type"] = "table"
        else:
            content = content.strip()
            if len(content) > 800:
                content = content[:800] + "\n…(truncated)…"
        it["content"] = content
        final.append(it)
        if len(final) >= top_k:
            break

    if not final:
        return json.dumps(
            {"query": query, "bot_id": bot_id, "year": year, "results": [], "context": ""},
            ensure_ascii=False,
        )

    blocks = []
    for r in final:
        src = r.get("source") or "Unknown"
        sec = r.get("section_hint") or ""
        plans = r.get("active_plans") or []
        groups = r.get("active_groups") or []

        page_ref = format_page_ref(
            r.get("page_start"),
            r.get("page_end"),
            r.get("printed_page_start"),
            r.get("printed_page_end"),
        )

        header = f"[source={src} | {page_ref} | type={r.get('chunk_type')}]\n"
        if sec:
            header += f"(section) {sec}\n"
        if groups:
            header += f"(กลุ่ม) {', '.join(groups)}\n"
        if plans:
            header += f"(แผน) {', '.join(plans)}\n"
        blocks.append(header + (r.get("content") or ""))

    context = "\n\n---\n\n".join(blocks)

    payload = {
        "query": query, "bot_id": bot_id, "year": year,
        "results": [
            {
                "chunk_id": r.get("chunk_id"),
                "source": r.get("source"),
                "doc_year": r.get("doc_year"),
                "page_start": r.get("page_start"),
                "page_end": r.get("page_end"),
                "printed_page_start": r.get("printed_page_start"),
                "printed_page_end": r.get("printed_page_end"),
                "chunk_type": r.get("chunk_type"),
                "section_hint": r.get("section_hint"),
                "active_plans": r.get("active_plans"),
                "active_groups": r.get("active_groups"),
                "score": round(float(r.get("hybrid_score", 0.0)), 4),
                "content": r.get("content"),
            }
            for r in final
        ],
        "context": context,
    }
    return json.dumps(payload, ensure_ascii=False)


# =========================================================
# 12) Tools
# =========================================================
@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="add_pdf_to_knowledge_base",
            description="Ingest PDF with a specific bot_id tag.",
            inputSchema={
                "type": "object",
                "properties": {
                    "filename_or_path": {"type": "string"},
                    "bot_id": {"type": "string", "default": "general"},
                },
                "required": ["filename_or_path"],
            },
        ),
        types.Tool(
            name="check_file_status",
            description="Checks status of a specific file.",
            inputSchema={
                "type": "object",
                "properties": {
                    "filename": {"type": "string"},
                    "bot_id": {"type": "string"},
                },
                "required": ["filename", "bot_id"],
            },
        ),
        types.Tool(
            name="query_knowledge_base",
            description=(
                "Hybrid search (vector + keyword) + rerank. "
                "Returns compact JSON with citations, active_plans, active_groups. "
                "ALWAYS provide a meaningful non-empty 'query' string extracted from the user question. "
                "NEVER call with empty query {}."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search keywords from the user question — MUST NOT be empty string",
                    },
                    "bot_id": {"type": "string", "default": "general"},
                    "year": {
                        "type": ["integer", "null"],
                        "description": "Filter by year in พ.ศ. only (e.g. 2568). Never use ค.ศ. year.",
                    },
                    "top_k": {"type": "integer", "default": 8},
                },
                "required": ["query"],
            },
        ),
        types.Tool(
            name="check_available_doc_years",
            description=(
                "Check what document years (พ.ศ.) are available for a bot_id. "
                "Call this ONCE only when user does not specify a year. "
                "Do NOT call this repeatedly."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "bot_id": {"type": "string"},
                },
                "required": ["bot_id"],
            },
        ),
        types.Tool(
            name="delete_bot",
            description="Wipe vectors from Pinecone by bot_id.",
            inputSchema={
                "type": "object",
                "properties": {"bot_id": {"type": "string"}},
                "required": ["bot_id"],
            },
        ),
        types.Tool(
            name="delete_document",
            description="Delete vectors for specific file from Pinecone.",
            inputSchema={
                "type": "object",
                "properties": {"bot_id": {"type": "string"}, "filename": {"type": "string"}},
                "required": ["bot_id", "filename"],
            },
        ),
    ]


@server.call_tool()
async def handle_call_tool(
    name: str, arguments: dict | None
) -> list[types.TextContent | types.ImageContent | types.EmbeddedResource]:
    arguments = arguments or {}
    try:
        if name == "add_pdf_to_knowledge_base":
            out = await add_pdf_to_knowledge_base(**arguments)
            return [types.TextContent(type="text", text=out)]
        if name == "check_file_status":
            out = await check_file_status(**arguments)
            return [types.TextContent(type="text", text=out)]
        if name == "query_knowledge_base":
            out = await query_knowledge_base(**arguments)
            return [types.TextContent(type="text", text=out)]
        if name == "check_available_doc_years":
            out = await check_available_doc_years(**arguments)
            return [types.TextContent(type="text", text=out)]
        if name == "delete_bot":
            out = await delete_bot(**arguments)
            return [types.TextContent(type="text", text=out)]
        if name == "delete_document":
            out = await delete_document(**arguments)
            return [types.TextContent(type="text", text=out)]
        raise ValueError(f"Unknown tool: {name}")
    except Exception as e:
        logger.error(f"Tool error {name}: {e}", exc_info=True)
        return [types.TextContent(type="text", text=f"Error: {str(e)}")]


async def add_pdf_to_knowledge_base(filename_or_path: str, bot_id: str = "general") -> str:
    target_path = filename_or_path
    if not os.path.isabs(filename_or_path) and not os.path.exists(filename_or_path):
        p = os.path.join(DOCUMENTS_DIR, filename_or_path)
        if os.path.exists(p):
            target_path = p
    if not os.path.exists(target_path):
        return f"Error: File not found at {target_path}"
    filename = os.path.basename(target_path)
    task_key = f"{bot_id}:{filename}"
    current = processing_status.get(task_key)
    if current and "Processing" in current:
        return f"⚠️ File '{filename}' is already being processed..."
    processing_status[task_key] = "Queued: Starting upload..."
    logger.info(f"📝 Queued: {task_key}")
    asyncio.create_task(_background_ingest_task(target_path, filename, bot_id))
    return f"✅ Started processing '{filename}'..."


async def check_file_status(filename: str, bot_id: str) -> str:
    return processing_status.get(f"{bot_id}:{filename}", "NOT_FOUND")


async def check_available_doc_years(bot_id: str, query: str = "") -> str:
    try:
        res = (
            supabase.table("document_chunks")
            .select("doc_year")
            .eq("bot_id", bot_id)
            .execute()
        )
        years = sorted(set(
            row["doc_year"] for row in (res.data or [])
            if row.get("doc_year")
        ))
        if not years:
            return json.dumps(
                {"bot_id": bot_id, "years": [], "message": "No documents found."},
                ensure_ascii=False,
            )
        return json.dumps({"bot_id": bot_id, "years": years}, ensure_ascii=False)
    except Exception as e:
        return f"Error: {str(e)}"


async def delete_bot(bot_id: str) -> str:
    try:
        index = pc.Index(index_name)
        index.delete(filter={"bot_id": {"$eq": bot_id}})
        return f"Delete command sent for bot_id: {bot_id}"
    except Exception as e:
        return f"Error deleting bot vectors: {str(e)}"


async def delete_document(bot_id: str, filename: str) -> str:
    try:
        index = pc.Index(index_name)
        index.delete(filter={"bot_id": {"$eq": bot_id}, "source": {"$eq": filename}})
        return f"Deleted vectors for {filename}"
    except Exception as e:
        return f"Error deleting document vectors: {str(e)}"


# =========================================================
# 13) SSE Transport
# =========================================================
class StreamMessage:
    def __init__(self, message):
        self.message = message
        self.metadata = {}

class Session:
    def __init__(self):
        self.server_write, self.client_read = anyio.create_memory_object_stream(10)
        self.client_write, self.server_read = anyio.create_memory_object_stream(10)

sessions: Dict[str, Session] = {}

async def handle_sse(request: Request):
    session_id = uuid.uuid4().hex
    session = Session()
    sessions[session_id] = session
    logger.info(f"New SSE connection: {session_id}")

    async def run_server_loop():
        try:
            await server.run(
                session.server_read,
                session.server_write,
                InitializationOptions(
                    server_name="rag-optimized-server",
                    server_version="1.0.0",
                    capabilities=server.get_capabilities(
                        notification_options=NotificationOptions(),
                        experimental_capabilities={},
                    ),
                ),
            )
        except Exception as e:
            logger.warning(f"Server loop stopped: {e}")

    asyncio.create_task(run_server_loop())

    async def event_generator():
        yield {"event": "endpoint", "data": f"/sse/messages?session_id={session_id}"}
        async with session.client_read:
            async for message in session.client_read:
                if hasattr(message, "message"):
                    yield {"event": "message", "data": message.message.model_dump_json()}
                elif isinstance(message, types.JSONRPCMessage):
                    yield {"event": "message", "data": message.model_dump_json()}
                else:
                    yield {"event": "message", "data": str(message)}

    return EventSourceResponse(event_generator())

async def handle_messages(request: Request):
    session_id = request.query_params.get("session_id")
    session = sessions.get(session_id)
    if not session:
        return JSONResponse({"error": "Session not found"}, status_code=404)
    message_data = await request.json()
    try:
        adapter = TypeAdapter(types.JSONRPCMessage)
        message_obj = adapter.validate_python(message_data)
        wrapped = StreamMessage(message_obj)
        await session.client_write.send(wrapped)
        return JSONResponse({"status": "accepted"})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

routes = [
    Route("/sse", handle_sse, methods=["GET"]),
    Route("/sse/messages", handle_messages, methods=["POST"]),
]
app = Starlette(routes=routes)

if __name__ == "__main__":
    import uvicorn
    print("Starting Server on http://0.0.0.0:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)