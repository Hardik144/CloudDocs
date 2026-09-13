import io
import os
import zipfile
import tarfile
from typing import Dict, Any, List, Tuple, Optional

EXCLUDED_NAMES = {
    "__pycache__", ".git", ".github", "node_modules", ".venv", "venv", 
    ".next", "dist", "build", ".DS_Store", "Thumbs.db", ".pytest_cache"
}

MAX_VIEWABLE_BYTES = 500 * 1024 # 500 KB limit for inline code viewing

def is_safe_path(target_path: str) -> bool:
    """Safeguard against ZipSlip path traversal."""
    normalized = os.path.normpath(target_path)
    return not (normalized.startswith("..") or os.path.isabs(normalized))

def parse_archive_bytes(content: bytes, filename: str) -> Tuple[Dict[str, Any], int, int]:
    """
    Parses archive bytes in-memory, extracts a clean nested directory tree,
    and returns (file_tree, total_files_count, total_dirs_count).
    """
    file_list = []
    
    if filename.endswith(".zip"):
        try:
            with zipfile.ZipFile(io.BytesIO(content), "r") as z:
                for info in z.infolist():
                    name = info.filename.rstrip("/")
                    if not name or not is_safe_path(name):
                        continue
                    parts = name.split("/")
                    if any(part in EXCLUDED_NAMES for part in parts):
                        continue
                    file_list.append({
                        "path": name,
                        "is_dir": info.is_dir(),
                        "size": info.file_size
                    })
        except Exception as e:
            raise ValueError(f"Corrupted or invalid zip archive: {str(e)}")
            
    elif filename.endswith((".tar.gz", ".tgz", ".tar")):
        try:
            mode = "r:gz" if filename.endswith((".tar.gz", ".tgz")) else "r:"
            with tarfile.open(fileobj=io.BytesIO(content), mode=mode) as t:
                for member in t.getmembers():
                    name = member.name.rstrip("/")
                    if not name or not is_safe_path(name):
                        continue
                    parts = name.split("/")
                    if any(part in EXCLUDED_NAMES for part in parts):
                        continue
                    file_list.append({
                        "path": name,
                        "is_dir": member.isdir(),
                        "size": member.size
                    })
        except Exception as e:
            raise ValueError(f"Corrupted or invalid tar archive: {str(e)}")
    else:
        raise ValueError("Unsupported archive format. Supported formats: .zip, .tar.gz, .tgz")

    total_files = sum(1 for f in file_list if not f["is_dir"])
    total_dirs = sum(1 for f in file_list if f["is_dir"])

    # Build nested tree
    root = {"name": os.path.splitext(filename)[0], "type": "directory", "children": {}}

    for item in file_list:
        parts = item["path"].split("/")
        current = root["children"]
        for idx, part in enumerate(parts):
            is_last = (idx == len(parts) - 1)
            if is_last:
                if item["is_dir"]:
                    if part not in current:
                        current[part] = {"name": part, "path": item["path"], "type": "directory", "children": {}}
                else:
                    current[part] = {
                        "name": part,
                        "path": item["path"],
                        "type": "file",
                        "size": item["size"]
                    }
            else:
                if part not in current:
                    current[part] = {"name": part, "path": "/".join(parts[:idx+1]), "type": "directory", "children": {}}
                current = current[part]["children"]

    def convert_dict_to_list(node: Dict[str, Any]) -> Dict[str, Any]:
        result = {
            "name": node["name"],
            "type": node["type"],
            "path": node.get("path", "")
        }
        if "size" in node:
            result["size"] = node["size"]
        if "children" in node:
            # Sort directories first, then alphabetical
            children_list = [convert_dict_to_list(child) for child in node["children"].values()]
            children_list.sort(key=lambda x: (x["type"] != "directory", x["name"].lower()))
            result["children"] = children_list
        return result

    nested_tree = convert_dict_to_list(root)
    return nested_tree, total_files, total_dirs

def read_file_from_archive(archive_bytes: bytes, filename: str, target_file_path: str) -> Dict[str, Any]:
    """Safely extracts a single file's text/code from an in-memory archive."""
    if not is_safe_path(target_file_path):
        raise ValueError("Invalid file path")

    if filename.endswith(".zip"):
        with zipfile.ZipFile(io.BytesIO(archive_bytes), "r") as z:
            try:
                info = z.getinfo(target_file_path)
                if info.file_size > MAX_VIEWABLE_BYTES:
                    return {
                        "content": None,
                        "size": info.file_size,
                        "is_binary": False,
                        "too_large": True,
                        "message": f"File is too large to preview inline ({round(info.file_size / 1024, 1)} KB). Please download the archive."
                    }
                with z.open(info) as f:
                    raw = f.read()
            except KeyError:
                raise FileNotFoundError(f"File '{target_file_path}' not found in archive")

    elif filename.endswith((".tar.gz", ".tgz", ".tar")):
        mode = "r:gz" if filename.endswith((".tar.gz", ".tgz")) else "r:"
        with tarfile.open(fileobj=io.BytesIO(archive_bytes), mode=mode) as t:
            try:
                member = t.getmember(target_file_path)
                if member.size > MAX_VIEWABLE_BYTES:
                    return {
                        "content": None,
                        "size": member.size,
                        "is_binary": False,
                        "too_large": True,
                        "message": f"File is too large to preview inline ({round(member.size / 1024, 1)} KB). Please download the archive."
                    }
                extracted = t.extractfile(member)
                if extracted is None:
                    raise FileNotFoundError("Could not extract file")
                raw = extracted.read()
            except KeyError:
                raise FileNotFoundError(f"File '{target_file_path}' not found in archive")
    else:
        raise ValueError("Unsupported archive format")

    # Check for binary content
    if b"\x00" in raw:
        return {
            "content": None,
            "size": len(raw),
            "is_binary": True,
            "too_large": False,
            "message": "Binary file cannot be previewed as text."
        }

    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        try:
            text = raw.decode("latin-1")
        except Exception:
            return {
                "content": None,
                "size": len(raw),
                "is_binary": True,
                "too_large": False,
                "message": "File encoding not supported for preview."
            }

    return {
        "content": text,
        "size": len(raw),
        "is_binary": False,
        "too_large": False,
        "message": None
    }
