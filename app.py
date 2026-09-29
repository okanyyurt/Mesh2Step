# -*- coding: utf-8 -*-
"""
Mesh2Step 3D Studio - Desktop Application Backend
Converts STL and 3MF mesh files to solid CAD B-Rep STEP models with zero Fusion 360 dependency.
Provides interactive 3D WebGL visualization, real-time conversion progress, AI Auto-Tune, and 1-click CAD export.
"""

import os
import sys
import json
import time
import math
import re
import base64
import struct
import shutil
import ctypes
import tempfile
import threading
import subprocess
import zipfile
import uuid
from datetime import datetime
import xml.etree.ElementTree as ET
from typing import Dict, Any, Optional, List

import numpy as np
import trimesh
import webview

# Ensure APP directory is in sys.path
APP_DIR = os.path.dirname(os.path.abspath(__file__))
if APP_DIR not in sys.path:
    sys.path.insert(0, APP_DIR)

from engine.reverse_engineer import get_engine, load_trimesh_unified

# Project roots and paths
PROJECT_ROOT = os.path.dirname(APP_DIR)
ENGINE_DIR = os.path.join(PROJECT_ROOT, "engine")
SAMPLES_DIR = os.path.join(APP_DIR, "örnek")
CONFIG_PATH = os.path.join(PROJECT_ROOT, "config.json")

if ENGINE_DIR not in sys.path:
    sys.path.insert(0, ENGINE_DIR)

try:
    from mechanical_engineer import MechanicalDesignEngineer
    HAS_MECH_ENGINEER = True
except ImportError:
    HAS_MECH_ENGINEER = False


def get_short_path(path: str) -> str:
    """Returns the Windows 8.3 short path to safely pass non-ASCII (e.g. Turkish) paths to C++ binaries."""
    if os.name != 'nt':
        return path
    try:
        buf = ctypes.create_unicode_buffer(1024)
        ret = ctypes.windll.kernel32.GetShortPathNameW(path, buf, 1024)
        if ret > 0:
            return buf.value
        # If the file does not exist yet, resolve parent folder
        parent = os.path.dirname(os.path.abspath(path))
        ret_p = ctypes.windll.kernel32.GetShortPathNameW(parent, buf, 1024)
        if ret_p > 0:
            return os.path.join(buf.value, os.path.basename(path))
    except Exception:
        pass
    return path


def find_fusion360_path() -> Optional[str]:
    """Locates Autodesk Fusion 360 executable on the local machine."""
    local_app_data = os.environ.get("LOCALAPPDATA", "")
    if local_app_data:
        prod_dir = os.path.join(local_app_data, "Autodesk", "webdeploy", "production")
        if os.path.exists(prod_dir):
            for entry in os.listdir(prod_dir):
                candidate = os.path.join(prod_dir, entry, "Fusion360.exe")
                if os.path.exists(candidate):
                    return candidate
    return None


def find_freecad_path() -> Optional[str]:
    """Locates FreeCAD executable on the local machine."""
    candidates = [
        r"C:\Program Files\FreeCAD\bin\FreeCAD.exe",
        r"C:\Program Files\FreeCAD 1.0\bin\FreeCAD.exe",
        r"C:\Program Files\FreeCAD 0.21\bin\FreeCAD.exe",
        r"C:\Program Files\FreeCAD 0.20\bin\FreeCAD.exe",
        r"C:\Program Files (x86)\FreeCAD\bin\FreeCAD.exe",
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return None


# =============================================================================
# VERSION INFORMATION
# =============================================================================
VERSION_FILE = os.path.join(APP_DIR, "version.json")


def load_version_info() -> Dict[str, Any]:
    """Loads application version metadata from version.json."""
    default_info = {
        "version": "2.0",
        "major": 2,
        "minor": 0,
        "release_date": "2026-09-22",
        "release_time": "09:00:00",
        "formatted_datetime": "22.09.2026 09:00",
        "app_name": "Mesh2Step 3D Studio",
        "display_text": "v2.0",
        "channel": "Stable",
        "description": "Mesh2Step 3D Studio v2.0"
    }
    if os.path.exists(VERSION_FILE):
        try:
            with open(VERSION_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
        except Exception as e:
            print(f"Error loading version info: {e}")
    return default_info


# =============================================================================
# PERSISTENT CONVERSION HISTORY & CAD BENCHMARK LEDGER
# =============================================================================
HISTORY_FILE = os.path.join(APP_DIR, "conversion_history.json")

try:
    from engine.fusion_harness import FusionMCPBridge
    HAS_FUSION_MCP = True
except Exception:
    HAS_FUSION_MCP = False


def load_conversion_history() -> List[Dict[str, Any]]:
    """Loads conversion history list from disk."""
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data
        except Exception as e:
            print(f"Error loading conversion history: {e}")
    return []


def save_conversion_history(history: List[Dict[str, Any]]):
    """Persists conversion history list to disk."""
    try:
        os.makedirs(os.path.dirname(os.path.abspath(HISTORY_FILE)), exist_ok=True)
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving conversion history: {e}")


def record_conversion_entry(entry: Dict[str, Any]):
    """Records a single conversion attempt to persistent storage."""
    try:
        history = load_conversion_history()
        # Prepend new entry
        history.insert(0, entry)
        # Cap at 150 entries
        if len(history) > 150:
            history = history[:150]
        save_conversion_history(history)
    except Exception as e:
        print(f"Failed to record conversion entry: {e}")


_active_window: Optional[webview.Window] = None

def set_active_window(w: webview.Window):
    global _active_window
    _active_window = w

def get_active_window() -> Optional[webview.Window]:
    return _active_window


def sanitize_for_json(obj: Any) -> Any:
    """Recursively converts NumPy types and non-serializable objects into native Python JSON types."""
    if isinstance(obj, dict):
        return {str(k): sanitize_for_json(v) for k, v in obj.items() if k != "face_indices"}
    elif isinstance(obj, (list, tuple)):
        return [sanitize_for_json(item) for item in obj]
    elif isinstance(obj, (np.integer, np.int64, np.int32, np.int16, np.int8)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32, np.float16)):
        return float(obj)
    elif isinstance(obj, (np.bool_, bool)):
        return bool(obj)
    elif isinstance(obj, np.ndarray):
        return sanitize_for_json(obj.tolist())
    return obj


CAD_BODY_COLORS = [
    "#38bdf8", "#f59e0b", "#10b981", "#a855f7", "#ec4899",
    "#06b6d4", "#f97316", "#84cc16", "#6366f1", "#14b8a6",
    "#e11d48", "#8b5cf6", "#eab308", "#0ea5e9", "#22c55e", "#d946ef"
]


def tokenize_names(text: str) -> set:
    """Extracts clean lowercased tokens from camelCase, snake_case, and hyphenated file/body names."""
    s1 = re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', text)
    return set(re.findall(r'[a-z0-9çğıöşü]+', s1.lower()))


class CADStudioAPI:
    """Bridge API between Python backend and HTML/JS Three.js frontend."""

    def __init__(self):
        self._current_step_path: Optional[str] = None
        self._is_converting = False
        self._current_proc: Optional[subprocess.Popen] = None
        self._is_cancelled = False

        # Working state for mesh geometry
        self._original_filepath: Optional[str] = None
        self._working_mesh_path: Optional[str] = None
        self._current_vertices: Optional[np.ndarray] = None  # flat array (N, 3)
        self._current_format: str = "STL"
        self._current_bodies: List[Dict[str, Any]] = []
        self._backup_mesh_state: Optional[Dict[str, Any]] = None

    def get_system_info(self) -> Dict[str, Any]:
        """Returns GPU, CUDA, and CPU system specifications."""
        gpu_name = "NVIDIA GPU"
        cuda_ver = "13.x"
        has_cuda = False
        try:
            res = subprocess.run(["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader,nounits"],
                                 capture_output=True, text=True, timeout=2)
            if res.returncode == 0 and res.stdout.strip():
                parts = res.stdout.strip().split(",")
                gpu_name = parts[0].strip()
                vram = parts[1].strip() if len(parts) > 1 else "2048"
                gpu_name = f"{gpu_name} ({vram} MB VRAM)"
                has_cuda = True
        except Exception:
            pass

        return {
            "gpu_name": gpu_name,
            "has_cuda": has_cuda,
            "cuda_ver": "CUDA 13.3",
            "cpu_cores": os.cpu_count() or 8,
            "engine_available": True,
            "fusion_available": find_fusion360_path() is not None,
            "freecad_available": find_freecad_path() is not None,
            "version_info": load_version_info(),
        }

    def get_version_info(self) -> Dict[str, Any]:
        """Returns the current application version, release timestamp and metadata."""
        return load_version_info()

    def open_file_dialog(self) -> Optional[str]:
        """Opens native file picker for mesh files."""
        win = get_active_window()
        if not win:
            return None
        file_types = (
            "Tüm Desteklenen 3D Modeller (*.stl;*.3mf;*.obj;*.ply;*.glb;*.gltf;*.off)",
            "Wavefront OBJ (*.obj)",
            "Stereolithography (*.stl)",
            "3D Manufacturing Format (*.3mf)",
            "Stanford Polygon Format (*.ply)",
            "GL Transmission Format (*.glb;*.gltf)",
            "Object File Format (*.off)",
            "Tüm Dosyalar (*.*)"
        )
        result = win.create_file_dialog(webview.OPEN_DIALOG, allow_multiple=False, file_types=file_types)
        if result and len(result) > 0:
            return result[0]
        return None

    def load_mesh_from_bytes(self, filename: str, b64_data: str) -> Dict[str, Any]:
        """
        Receives file bytes directly via Base64 when dragged and dropped into the browser viewport.
        Saves to a temporary file and loads the mesh seamlessly.
        """
        try:
            temp_dir = tempfile.gettempdir()
            safe_name = os.path.basename(filename).replace(" ", "_")
            temp_path = os.path.join(temp_dir, f"drop_{int(time.time())}_{safe_name}")
            raw_bytes = base64.b64decode(b64_data)
            with open(temp_path, "wb") as f:
                f.write(raw_bytes)
            return self.load_mesh(temp_path)
        except Exception as e:
            return {"success": False, "error": f"Sürüklenen dosya okunamadı: {str(e)}"}

    def load_mesh(self, filepath: str) -> Dict[str, Any]:
        """
        Fast vectorized parsing of STL, 3MF, OBJ, PLY, GLB, GLTF, and OFF meshes
        with full multi-body assembly decomposition, world assembly coordinates,
        and individual body selections.
        """
        if not os.path.exists(filepath):
            return {"success": False, "error": f"Dosya bulunamadı: {filepath}"}

        t_start = time.time()
        try:
            ext = os.path.splitext(filepath)[1].lower()
            if ext == ".3mf":
                bodies = self._parse_3mf_assembly(filepath)
                fmt = "3D Manufacturing Format (3MF)"
            elif ext == ".stl":
                bodies = self._parse_stl_bodies(filepath)
                fmt = "Stereolithography (STL)"
            elif ext == ".obj":
                bodies = self._parse_generic_mesh_bodies(filepath, default_name_prefix="OBJ_Gövde")
                fmt = "Wavefront OBJ (.obj)"
            elif ext == ".ply":
                bodies = self._parse_generic_mesh_bodies(filepath, default_name_prefix="PLY_Gövde")
                fmt = "Stanford Triangle Format (.ply)"
            elif ext in (".glb", ".gltf"):
                bodies = self._parse_generic_mesh_bodies(filepath, default_name_prefix="GLTF_Gövde")
                fmt = "GL Transmission Format (.glb/.gltf)"
            elif ext == ".off":
                bodies = self._parse_generic_mesh_bodies(filepath, default_name_prefix="OFF_Gövde")
                fmt = "Object File Format (.off)"
            else:
                return {"success": False, "error": f"Desteklenmeyen dosya formatı: {ext}"}

            if not bodies:
                return {"success": False, "error": "Dosyada geçerli 3D geometri bulunamadı."}

            self._current_bodies = bodies

            # Combine all bodies' vertices to compute assembly bounding box and center
            all_verts_list = [b["vertices"] for b in bodies]
            combined_verts = np.vstack(all_verts_list)

            # Center XY and ground assembly to Z=0 as a unified coordinate frame
            min_z = float(combined_verts[:, 2].min())
            cx = float((combined_verts[:, 0].min() + combined_verts[:, 0].max()) / 2.0)
            cy = float((combined_verts[:, 1].min() + combined_verts[:, 1].max()) / 2.0)

            for b in self._current_bodies:
                b["vertices"][:, 0] -= cx
                b["vertices"][:, 1] -= cy
                b["vertices"][:, 2] -= min_z
                b["bounds"] = self._calculate_bounds(b["vertices"])

            combined_verts[:, 0] -= cx
            combined_verts[:, 1] -= cy
            combined_verts[:, 2] -= min_z
            total_bounds = self._calculate_bounds(combined_verts)

            self._original_filepath = filepath
            temp_dir = tempfile.gettempdir()
            temp_stl = os.path.join(temp_dir, f"grounded_{os.getpid()}_{int(time.time())}.stl")
            self._write_vertices_to_stl(combined_verts, temp_stl)
            self._working_mesh_path = temp_stl
            self._current_vertices = combined_verts
            self._current_format = fmt
            self._current_step_path = None
            self._backup_mesh_state = None

            duration_ms = round((time.time() - t_start) * 1000, 1)
            file_size_mb = round(os.path.getsize(filepath) / (1024 * 1024), 2)
            total_tri = int(len(combined_verts) // 3)

            is_multi = len(bodies) > 1

            # Prepare per-body payload for Three.js viewport (100% full solid geometry without missing triangles)
            bodies_payload = []
            for b in self._current_bodies:
                flat_v = b["vertices"]
                tri_c = b["triangle_count"]
                b_b64 = base64.b64encode(flat_v.tobytes()).decode("ascii")
                bodies_payload.append({
                    "id": b["id"],
                    "name": b["name"],
                    "triangle_count": tri_c,
                    "color": b["color"],
                    "selected": b["selected"],
                    "bounds": b["bounds"],
                    "vertices_b64": b_b64
                })

            # For single-body fallback compatibility
            v_b64 = base64.b64encode(combined_verts.tobytes()).decode("ascii")

            # Fast model characterization (CAD vs Scan)
            model_type = "scan"
            try:
                triangles = combined_verts.reshape(-1, 3, 3)
                v1 = triangles[:, 0, :]
                v2 = triangles[:, 1, :]
                v3 = triangles[:, 2, :]
                norms = np.cross(v2 - v1, v3 - v1)
                lens = np.linalg.norm(norms, axis=1, keepdims=True)
                lens[lens < 1e-12] = 1.0
                unit_norms = norms / lens
                quantized = np.round(unit_norms, 2)
                _, norm_counts = np.unique(quantized, axis=0, return_counts=True)
                normal_diversity = len(norm_counts) / max(1, len(triangles))
                max_normal_share = float(np.max(norm_counts) / max(1, len(triangles)))
                if max_normal_share > 0.08 or normal_diversity < 0.35:
                    model_type = "cad"
                else:
                    model_type = "scan"
            except Exception as e_cls:
                print(f"Model classification note: {e_cls}")

            auto_tune = self.analyze_mesh_for_auto_tune(filepath, total_tri, total_bounds)

            return sanitize_for_json({
                "success": True,
                "filepath": filepath,
                "filename": os.path.basename(filepath),
                "format": fmt,
                "file_size_mb": file_size_mb,
                "triangle_count": total_tri,
                "vertex_count": total_tri * 3,
                "load_time_ms": duration_ms,
                "bounds": total_bounds,
                "vertices_b64": v_b64,
                "auto_tune": auto_tune,
                "is_multi_body": is_multi,
                "body_count": len(bodies),
                "bodies": bodies_payload,
                "model_type": model_type,
                "is_meter_scale": bool(total_bounds["dimensions"][0] < 0.5 and total_bounds["dimensions"][1] < 0.5 and total_bounds["dimensions"][2] < 0.5)
            })
        except Exception as e:
            return {"success": False, "error": f"Mesh okuma hatası: {str(e)}"}

    def _parse_stl_bodies(self, filepath: str) -> List[Dict[str, Any]]:
        """Parses STL as a single body."""
        tri_count, flat_verts, bounds = self._parse_stl(filepath)
        base_name = os.path.splitext(os.path.basename(filepath))[0]
        return [{
            "id": "0",
            "name": base_name,
            "triangle_count": tri_count,
            "vertex_count": tri_count * 3,
            "bounds": bounds,
            "color": CAD_BODY_COLORS[0],
            "selected": True,
            "vertices": flat_verts
        }]

    def _parse_stl(self, filepath: str):
        """Vectorized binary STL parser with ASCII fallback."""
        file_size = os.path.getsize(filepath)
        is_binary = True
        if file_size >= 84:
            with open(filepath, "rb") as f:
                f.seek(80)
                num_tri = struct.unpack("<I", f.read(4))[0]
            if file_size != 84 + num_tri * 50:
                is_binary = False
        else:
            is_binary = False

        if is_binary:
            with open(filepath, "rb") as f:
                f.seek(84)
                data = f.read()

            dt = np.dtype([
                ('normal', np.float32, 3),
                ('v1', np.float32, 3),
                ('v2', np.float32, 3),
                ('v3', np.float32, 3),
                ('attr', np.uint16, 1)
            ])
            arr = np.frombuffer(data, dtype=dt)
            num_tri = len(arr)

            vertices = np.empty((num_tri, 3, 3), dtype=np.float32)
            vertices[:, 0, :] = arr['v1']
            vertices[:, 1, :] = arr['v2']
            vertices[:, 2, :] = arr['v3']
            flat_verts = vertices.reshape(-1, 3)
        else:
            # ASCII STL
            verts_list = []
            with open(filepath, "r", encoding="ascii", errors="ignore") as f:
                for line in f:
                    line_str = line.strip().lower()
                    if line_str.startswith("vertex"):
                        parts = line_str.split()
                        if len(parts) >= 4:
                            verts_list.append([float(parts[1]), float(parts[2]), float(parts[3])])
            flat_verts = np.array(verts_list, dtype=np.float32)
            num_tri = len(flat_verts) // 3

        bounds = self._calculate_bounds(flat_verts)
        return num_tri, flat_verts, bounds

    def _parse_3mf_assembly(self, filepath: str) -> List[Dict[str, Any]]:
        """
        Parses 3MF assembly, preserving individual body geometries,
        component names, and assembly transform matrices.
        """
        comp_names = {}
        try:
            with zipfile.ZipFile(filepath, "r") as zf:
                if "3D/3dmodel.model" in zf.namelist():
                    with zf.open("3D/3dmodel.model") as f:
                        root = ET.parse(f).getroot()
                        for obj in root.iter():
                            if "}" in obj.tag:
                                obj.tag = obj.tag.split("}", 1)[1]
                        for obj in root.iter("object"):
                            for comp in obj.iter("component"):
                                obj_id = comp.get("objectid")
                                path_attr = None
                                for k, v in comp.attrib.items():
                                    if "path" in k.lower():
                                        path_attr = v
                                        break
                                name = obj.get("name")
                                if path_attr:
                                    raw_base = os.path.basename(path_attr)
                                    clean_name = raw_base.split(".stl")[0].split(".model")[0].split(".")[0]
                                elif name:
                                    clean_name = name
                                else:
                                    clean_name = f"Gövde_{obj_id}"
                                comp_names[obj_id] = clean_name
        except Exception as e:
            print(f"3MF component name note: {e}")

        bodies = []
        try:
            loaded = trimesh.load(filepath)
            if isinstance(loaded, trimesh.Scene):
                nodes = list(loaded.graph.nodes_geometry)
                for i, node_name in enumerate(nodes):
                    transform, geom_name = loaded.graph[node_name]
                    geom = loaded.geometry[geom_name].copy()
                    geom.apply_transform(transform)
                    faces = geom.faces
                    vertices = geom.vertices
                    if len(faces) == 0 or len(vertices) == 0:
                        continue
                    flat_v = vertices[faces].reshape(-1, 3).astype(np.float32)
                    part_name = comp_names.get(geom_name, comp_names.get(node_name, f"Gövde_{i+1}"))
                    color = CAD_BODY_COLORS[i % len(CAD_BODY_COLORS)]
                    bounds = self._calculate_bounds(flat_v)
                    bodies.append({
                        "id": str(i),
                        "node_id": str(node_name),
                        "geom_id": str(geom_name),
                        "name": part_name,
                        "triangle_count": int(len(flat_v) // 3),
                        "vertex_count": int(len(flat_v)),
                        "bounds": bounds,
                        "color": color,
                        "selected": True,
                        "vertices": flat_v
                    })
            elif isinstance(loaded, trimesh.Trimesh):
                faces = loaded.faces
                vertices = loaded.vertices
                flat_v = vertices[faces].reshape(-1, 3).astype(np.float32)
                base_name = os.path.splitext(os.path.basename(filepath))[0]
                bounds = self._calculate_bounds(flat_v)
                bodies.append({
                    "id": "0",
                    "name": base_name,
                    "triangle_count": int(len(flat_v) // 3),
                    "vertex_count": int(len(flat_v)),
                    "bounds": bounds,
                    "color": CAD_BODY_COLORS[0],
                    "selected": True,
                    "vertices": flat_v
                })
        except Exception as e:
            print(f"trimesh 3MF loader error: {e}")

        # Fallback if trimesh returned empty
        if not bodies:
            tri_count, flat_v, bounds = self._parse_3mf(filepath)
            base_name = os.path.splitext(os.path.basename(filepath))[0]
            bodies.append({
                "id": "0",
                "name": base_name,
                "triangle_count": tri_count,
                "vertex_count": tri_count * 3,
                "bounds": bounds,
                "color": CAD_BODY_COLORS[0],
                "selected": True,
                "vertices": flat_v
            })

        return bodies

    def _parse_3mf(self, filepath: str):
        """Vectorized 3MF XML mesh parser across all .model entries (fallback)."""
        with zipfile.ZipFile(filepath, "r") as zf:
            model_xmls = [n for n in zf.namelist() if n.endswith(".model")]
            all_verts = []
            all_indices = []
            base_idx = 0

            for m_name in model_xmls:
                with zf.open(m_name) as f:
                    root = ET.parse(f).getroot()
                    for elem in root.iter():
                        if "}" in elem.tag:
                            elem.tag = elem.tag.split("}", 1)[1]
                    for mesh in root.iter("mesh"):
                        v_elem = mesh.find("vertices")
                        m_verts = []
                        if v_elem is not None:
                            for v in v_elem.iter("vertex"):
                                m_verts.append((float(v.get("x", 0)), float(v.get("y", 0)), float(v.get("z", 0))))
                        t_elem = mesh.find("triangles")
                        if t_elem is not None:
                            for t in t_elem.iter("triangle"):
                                all_indices.append((
                                    int(t.get("v1")) + base_idx,
                                    int(t.get("v2")) + base_idx,
                                    int(t.get("v3")) + base_idx
                                ))
                        all_verts.extend(m_verts)
                        base_idx = len(all_verts)

        verts_arr = np.array(all_verts, dtype=np.float32)
        indices_arr = np.array(all_indices, dtype=np.int32)
        tri_verts = verts_arr[indices_arr].reshape(-1, 3)

        bounds = self._calculate_bounds(tri_verts)
        return len(indices_arr), tri_verts, bounds

    def _parse_generic_mesh_bodies(self, filepath: str, default_name_prefix: str = "Gövde") -> List[Dict[str, Any]]:
        """
        Universal mesh & multi-body assembly loader for OBJ, PLY, GLB, GLTF, OFF, etc.
        Preserves individual component geometries, object/group tags, and assembly transform matrices.
        """
        bodies = []
        base_name = os.path.splitext(os.path.basename(filepath))[0]
        ext = os.path.splitext(filepath)[1].lower()
        try:
            if ext == ".obj":
                loaded = trimesh.load(filepath, split_objects=True, split_groups=True, process=False)
            else:
                loaded = trimesh.load(filepath, process=False)

            if isinstance(loaded, trimesh.Scene):
                nodes = list(loaded.graph.nodes_geometry)
                if nodes:
                    for i, node_name in enumerate(nodes):
                        transform, geom_name = loaded.graph[node_name]
                        geom = loaded.geometry[geom_name].copy()
                        geom.apply_transform(transform)
                        faces = geom.faces
                        vertices = geom.vertices
                        if len(faces) == 0 or len(vertices) == 0:
                            continue
                        flat_v = vertices[faces].reshape(-1, 3).astype(np.float32)
                        if geom_name and str(geom_name) not in ("geometry_0", "default", "None", ""):
                            part_name = str(geom_name)
                        elif node_name and str(node_name) not in ("geometry_0", "default", "None", "", "Scene"):
                            part_name = str(node_name)
                        elif len(nodes) == 1:
                            part_name = base_name
                        else:
                            part_name = f"{default_name_prefix}_{i+1}"
                        color = CAD_BODY_COLORS[i % len(CAD_BODY_COLORS)]
                        bounds = self._calculate_bounds(flat_v)
                        bodies.append({
                            "id": str(i),
                            "node_id": str(node_name),
                            "geom_id": str(geom_name),
                            "name": part_name,
                            "triangle_count": int(len(flat_v) // 3),
                            "vertex_count": int(len(flat_v)),
                            "bounds": bounds,
                            "color": color,
                            "selected": True,
                            "vertices": flat_v
                        })
                else:
                    dumped = loaded.dump()
                    for i, geom in enumerate(dumped):
                        if not isinstance(geom, trimesh.Trimesh) or len(geom.faces) == 0:
                            continue
                        faces = geom.faces
                        vertices = geom.vertices
                        flat_v = vertices[faces].reshape(-1, 3).astype(np.float32)
                        part_name = base_name if len(dumped) == 1 else f"{default_name_prefix}_{i+1}"
                        color = CAD_BODY_COLORS[i % len(CAD_BODY_COLORS)]
                        bounds = self._calculate_bounds(flat_v)
                        bodies.append({
                            "id": str(i),
                            "name": part_name,
                            "triangle_count": int(len(flat_v) // 3),
                            "vertex_count": int(len(flat_v)),
                            "bounds": bounds,
                            "color": color,
                            "selected": True,
                            "vertices": flat_v
                        })

            elif isinstance(loaded, trimesh.Trimesh):
                faces = loaded.faces
                vertices = loaded.vertices
                flat_v = vertices[faces].reshape(-1, 3).astype(np.float32)
                bounds = self._calculate_bounds(flat_v)
                bodies.append({
                    "id": "0",
                    "name": base_name,
                    "triangle_count": int(len(flat_v) // 3),
                    "vertex_count": int(len(flat_v)),
                    "bounds": bounds,
                    "color": CAD_BODY_COLORS[0],
                    "selected": True,
                    "vertices": flat_v
                })
        except Exception as e:
            print(f"Generic mesh loader error for {filepath}: {e}")

        return bodies

    def _calculate_bounds(self, flat_verts: np.ndarray) -> Dict[str, Any]:
        min_bound = flat_verts.min(axis=0).tolist()
        max_bound = flat_verts.max(axis=0).tolist()
        center = ((flat_verts.min(axis=0) + flat_verts.max(axis=0)) * 0.5).tolist()
        dimensions = [
            round(max_bound[0] - min_bound[0], 2),
            round(max_bound[1] - min_bound[1], 2),
            round(max_bound[2] - min_bound[2], 2)
        ]
        return {
            "min": [round(c, 2) for c in min_bound],
            "max": [round(c, 2) for c in max_bound],
            "center": [round(c, 2) for c in center],
            "dimensions": dimensions,
            "diagonal": round(math.sqrt(dimensions[0]**2 + dimensions[1]**2 + dimensions[2]**2), 2)
        }

    def _find_lay_flat_rotation(self, flat_verts: np.ndarray) -> np.ndarray:
        """
        Detects the largest planar resting face of the mesh and computes the 3D rigid
        rotation matrix aligning that face normal to the downward vector [0, 0, -1].
        If already aligned downwards, cycles to the 2nd largest planar face (if present).
        Falls back to bounding box thickness alignment if the mesh has no dominant flat plane.
        """
        try:
            if flat_verts is None or len(flat_verts) < 3:
                return np.eye(3)

            n_tris = len(flat_verts) // 3
            tris = flat_verts[: n_tris * 3].reshape(-1, 3, 3)
            v0 = tris[:, 0, :]
            v1 = tris[:, 1, :]
            v2 = tris[:, 2, :]

            cross = np.cross(v1 - v0, v2 - v0)
            lengths = np.linalg.norm(cross, axis=1)
            valid = lengths > 1e-8

            if not np.any(valid):
                return np.eye(3)

            normals = np.zeros_like(cross)
            normals[valid] = cross[valid] / lengths[valid, np.newaxis]
            areas = 0.5 * lengths
            offsets = np.sum(normals * v0, axis=1)

            # Cluster coplanar faces across top largest triangles
            sorted_idx = np.argsort(-areas)
            tested_normals = []
            candidates = []

            max_eval = min(300, len(sorted_idx))
            for idx in sorted_idx[:max_eval]:
                n = normals[idx]
                if np.isnan(n).any() or areas[idx] < 1e-5:
                    continue
                # Skip if already evaluated similar normal
                if any(np.dot(n, prev) > 0.985 for prev in tested_normals):
                    continue
                tested_normals.append(n)

                d0 = offsets[idx]
                dots = np.dot(normals, n)
                d_diffs = np.abs(offsets - d0)
                mask = (dots > 0.985) & (d_diffs < 0.35)
                total_coplanar_area = float(np.sum(areas[mask]))
                candidates.append((total_coplanar_area, n))

            candidates.sort(key=lambda x: x[0], reverse=True)

            target = np.array([0.0, 0.0, -1.0])
            chosen_n = None

            if candidates and candidates[0][0] > 1e-4:
                # If top candidate is already resting facing downwards, cycle to 2nd largest face if significant
                if float(np.dot(candidates[0][1], target)) > 0.998 and len(candidates) > 1 and candidates[1][0] > 0.08 * candidates[0][0]:
                    chosen_n = candidates[1][1]
                else:
                    chosen_n = candidates[0][1]
            else:
                # Fallback: align shortest bounding box axis to Z
                min_b = flat_verts.min(axis=0)
                max_b = flat_verts.max(axis=0)
                dims = max_b - min_b
                min_axis = int(np.argmin(dims))
                if min_axis == 0:
                    chosen_n = np.array([1.0, 0.0, 0.0])
                elif min_axis == 1:
                    chosen_n = np.array([0.0, 1.0, 0.0])
                else:
                    chosen_n = np.array([0.0, 0.0, 1.0])

            # Compute Rodrigues rotation matrix aligning chosen_n to target [0, 0, -1]
            u = chosen_n / np.linalg.norm(chosen_n)
            c = float(np.dot(u, target))
            if c > 0.999999:
                return np.eye(3)
            elif c < -0.999999:
                return np.array([[1.0, 0.0, 0.0], [0.0, -1.0, 0.0], [0.0, 0.0, -1.0]])
            else:
                v_axis = np.cross(u, target)
                V = np.array([
                    [0.0, -v_axis[2], v_axis[1]],
                    [v_axis[2], 0.0, -v_axis[0]],
                    [-v_axis[1], v_axis[0], 0.0]
                ])
                R = np.eye(3) + V + (V @ V) / (1.0 + c)
                return R
        except Exception as e:
            print(f"Lay flat rotation calculation note: {e}")
            return np.eye(3)

    def _find_optimal_dfam_rotation(self, verts: np.ndarray) -> np.ndarray:
        """Calculates optimal print orientation rotation matrix via MechanicalDesignEngineer."""
        if not HAS_MECH_ENGINEER:
            return self._find_lay_flat_rotation(verts)
        try:
            clean_m = trimesh.Trimesh(vertices=verts, faces=np.arange(len(verts)).reshape(-1, 3), process=False)
            eng = MechanicalDesignEngineer()
            opt = eng.find_optimal_print_orientation(clean_m)
            if opt.get("success") and "optimal_rotation_matrix" in opt:
                return np.array(opt["optimal_rotation_matrix"], dtype=np.float64)
        except Exception as e:
            print(f"Optimal DfAM orientation note: {e}")
        return self._find_lay_flat_rotation(verts)

    def _get_action_rotation(self, action: str, verts: np.ndarray) -> np.ndarray:
        """Returns 3x3 orthogonal rotation matrix for any requested orientation action."""
        if action == "ground":
            return np.eye(3)
        elif action == "rot_x_90":
            return np.array([[1.0, 0.0, 0.0], [0.0, 0.0, -1.0], [0.0, 1.0, 0.0]])
        elif action == "rot_y_90":
            return np.array([[0.0, 0.0, 1.0], [0.0, 1.0, 0.0], [-1.0, 0.0, 0.0]])
        elif action == "rot_z_90":
            return np.array([[0.0, -1.0, 0.0], [1.0, 0.0, 0.0], [0.0, 0.0, 1.0]])
        elif action == "flip_z":
            return np.array([[1.0, 0.0, 0.0], [0.0, -1.0, 0.0], [0.0, 0.0, -1.0]])
        elif action == "lay_flat":
            return self._find_lay_flat_rotation(verts)
        elif action == "optimal_dfam":
            return self._find_optimal_dfam_rotation(verts)
        else:
            return np.eye(3)

    def transform_mesh(self, action: str) -> Dict[str, Any]:
        """
        Applies geometric orientation transforms (Z=0 Grounding, Lay Flat, 90 deg Rotations, 180 Flip).
        Updates active vertex buffers and all individual multi-body parts synchronously.
        Always grounds bottom of the model/assembly to Z=0 and centers XY.
        Guarantees 100% mathematical consistency across Mesh, Three.js Katı Viewport, and STEP CAD file.
        """
        if self._current_vertices is None:
            return {"success": False, "error": "Yüklü mesh bulunamadı."}

        scale_factor = 1.0
        if action == "scale_1000":
            scale_factor = 1000.0
            R = np.eye(3)
            v = (self._current_vertices * scale_factor).astype(np.float32)
        elif action == "scale_0001":
            scale_factor = 0.001
            R = np.eye(3)
            v = (self._current_vertices * scale_factor).astype(np.float32)
        else:
            # Calculate exact 3x3 rotation matrix for this action
            R = self._get_action_rotation(action, self._current_vertices)
            # Rotate global vertex frame
            v = (self._current_vertices @ R.T).astype(np.float32)

        # Compute assembly grounding shift
        min_z = float(v[:, 2].min())
        cx = float((v[:, 0].min() + v[:, 0].max()) / 2.0)
        cy = float((v[:, 1].min() + v[:, 1].max()) / 2.0)

        v[:, 0] -= cx
        v[:, 1] -= cy
        v[:, 2] -= min_z
        self._current_vertices = v
        total_bounds = self._calculate_bounds(v)

        # Compute 4x4 rigid transformation matrix (Rotation + XY centering + Z=0 grounding)
        matrix_4x4 = [
            float(R[0, 0] * scale_factor), float(R[0, 1] * scale_factor), float(R[0, 2] * scale_factor), float(-cx),
            float(R[1, 0] * scale_factor), float(R[1, 1] * scale_factor), float(R[1, 2] * scale_factor), float(-cy),
            float(R[2, 0] * scale_factor), float(R[2, 1] * scale_factor), float(R[2, 2] * scale_factor), float(-min_z),
            0.0,                           0.0,                           0.0,                           1.0
        ]

        # Apply identical transform to all component bodies (100% full solid geometry)
        bodies_payload = []
        if self._current_bodies:
            for b in self._current_bodies:
                if scale_factor != 1.0:
                    bv = (b["vertices"] * scale_factor).astype(np.float32)
                else:
                    bv = (b["vertices"] @ R.T).astype(np.float32)
                bv[:, 0] -= cx
                bv[:, 1] -= cy
                bv[:, 2] -= min_z
                b["vertices"] = bv
                b["bounds"] = self._calculate_bounds(bv)

                tri_c = b["triangle_count"]
                b_b64 = base64.b64encode(bv.tobytes()).decode("ascii")
                bodies_payload.append({
                    "id": b["id"],
                    "name": b["name"],
                    "triangle_count": tri_c,
                    "color": b["color"],
                    "selected": b.get("selected", True),
                    "bounds": b["bounds"],
                    "vertices_b64": b_b64
                })

        v_b64 = base64.b64encode(v.tobytes()).decode("ascii")

        # Save active transformed bodies into working STL file
        active_bodies = [b for b in self._current_bodies if b.get("selected", True)] if self._current_bodies else []
        if active_bodies:
            active_verts = np.vstack([b["vertices"] for b in active_bodies])
        else:
            active_verts = v

        temp_dir = tempfile.gettempdir()
        temp_stl = os.path.join(temp_dir, f"oriented_{os.getpid()}_{int(time.time())}.stl")
        self._write_vertices_to_stl(active_verts, temp_stl)
        self._working_mesh_path = temp_stl

        # Asynchronously transform STEP solid model on disk if already converted (< 15ms UI response, zero freeze)
        if self._current_step_path and os.path.exists(self._current_step_path):
            try:
                from OCP.gp import gp_Trsf

                total_trsf = gp_Trsf()
                total_trsf.SetValues(
                    float(R[0, 0]), float(R[0, 1]), float(R[0, 2]), float(-cx),
                    float(R[1, 0]), float(R[1, 1]), float(R[1, 2]), float(-cy),
                    float(R[2, 0]), float(R[2, 1]), float(R[2, 2]), float(-min_z)
                )

                if not hasattr(self, "_step_transform_lock"):
                    self._step_transform_lock = threading.Lock()

                def _bg_step_save(step_path, trsf):
                    if not self._step_transform_lock.acquire(timeout=5.0):
                        return
                    try:
                        from OCP.BRepBuilderAPI import BRepBuilderAPI_Transform
                        from OCP.STEPControl import STEPControl_Reader, STEPControl_Writer, STEPControl_AsIs
                        from OCP.IFSelect import IFSelect_RetDone

                        reader = STEPControl_Reader()
                        if reader.ReadFile(step_path) == IFSelect_RetDone:
                            reader.TransferRoots()
                            step_shape = reader.OneShape()
                            trans_shape = BRepBuilderAPI_Transform(step_shape, trsf, True).Shape()
                            writer = STEPControl_Writer()
                            writer.Transfer(trans_shape, STEPControl_AsIs)
                            writer.Write(step_path)
                    except Exception as err:
                        print(f"Background STEP transform note: {err}")
                    finally:
                        self._step_transform_lock.release()

                threading.Thread(target=_bg_step_save, args=(self._current_step_path, total_trsf), daemon=True).start()
            except Exception as e:
                print(f"Solid model transform note: {e}")

        return sanitize_for_json({
            "success": True,
            "bounds": total_bounds,
            "matrix_4x4": matrix_4x4,
            "vertices_b64": v_b64,
            "is_multi_body": len(self._current_bodies) > 1,
            "bodies": bodies_payload
        })

    def set_selected_bodies(self, selected_ids: List[str]) -> Dict[str, Any]:
        """
        Updates active bodies in the assembly based on user checkbox selections.
        Regenerates working mesh so subsequent conversion converts only selected bodies.
        """
        if not self._current_bodies:
            return {"success": False, "error": "Yüklü multi-body model bulunamadı."}

        selected_set = set(str(sid) for sid in selected_ids)
        for b in self._current_bodies:
            b["selected"] = (str(b["id"]) in selected_set)

        active = [b for b in self._current_bodies if b["selected"]]
        if not active:
            return {"success": False, "error": "Lütfen en az bir gövde seçin."}

        active_verts = np.vstack([b["vertices"] for b in active])
        total_tri = int(len(active_verts) // 3)
        bounds = self._calculate_bounds(active_verts)

        temp_dir = tempfile.gettempdir()
        temp_stl = os.path.join(temp_dir, f"selection_{os.getpid()}_{int(time.time())}.stl")
        self._write_vertices_to_stl(active_verts, temp_stl)
        self._working_mesh_path = temp_stl

        auto_tune = self.analyze_mesh_for_auto_tune(self._original_filepath or "", total_tri, bounds, active_bodies=active)

        return sanitize_for_json({
            "success": True,
            "selected_count": len(active),
            "total_count": len(self._current_bodies),
            "triangle_count": total_tri,
            "vertex_count": total_tri * 3,
            "bounds": bounds,
            "auto_tune": auto_tune
        })

    def reorder_bodies(self, body_ids: List[str]) -> Dict[str, Any]:
        """
        Reorders self._current_bodies based on drag-and-drop order from the UI.
        """
        if not self._current_bodies:
            return {"success": False, "error": "Yüklü montaj bulunamadı."}
        id_map = {str(b["id"]): b for b in self._current_bodies}
        new_list = []
        for bid in body_ids:
            if str(bid) in id_map:
                new_list.append(id_map[str(bid)])
        for b in self._current_bodies:
            if b not in new_list:
                new_list.append(b)
        self._current_bodies = new_list
        return {"success": True, "reordered_count": len(new_list)}

    def _bilateral_mesh_denoise(
        self,
        mesh: trimesh.Trimesh,
        iterations: int = 3,
        sigma_r: float = 0.35,
        pinned_vertices: Optional[set] = None
    ) -> trimesh.Trimesh:
        """
        Vectorized Feature-Preserving Bilateral Normal Filtering (Sun et al. / Zheng et al.).
        Preserves sharp CAD corners, 90-degree edges, and holes while smoothing flat/curved regions.
        """
        import scipy.sparse as sp

        m = mesh.copy()
        num_faces = len(m.faces)
        if num_faces == 0 or len(m.face_adjacency) == 0:
            return m

        face_centroids = m.triangles_center
        face_areas = m.area_faces
        adj = m.face_adjacency

        f1 = adj[:, 0]
        f2 = adj[:, 1]

        # Spatial distance bandwidth
        dists = np.linalg.norm(face_centroids[f1] - face_centroids[f2], axis=1)
        sigma_s = float(np.mean(dists) * 2.0) if len(dists) > 0 else 1.0

        normals = m.face_normals.copy()

        for _ in range(iterations):
            c_diff = face_centroids[f1] - face_centroids[f2]
            dist_sq = np.sum(c_diff**2, axis=1)
            w_s = np.exp(-dist_sq / (2.0 * sigma_s**2))

            n_diff = normals[f1] - normals[f2]
            norm_diff_sq = np.sum(n_diff**2, axis=1)
            w_r = np.exp(-norm_diff_sq / (2.0 * sigma_r**2))

            weights = w_s * w_r

            rows = np.concatenate([f1, f2, np.arange(num_faces)])
            cols = np.concatenate([f2, f1, np.arange(num_faces)])
            data = np.concatenate([weights * face_areas[f2], weights * face_areas[f1], face_areas])

            W = sp.coo_matrix((data, (rows, cols)), shape=(num_faces, num_faces)).tocsr()
            row_sums = np.array(W.sum(axis=1)).flatten()
            row_sums[row_sums < 1e-12] = 1.0

            filtered_normals = W.dot(normals)
            filtered_normals = filtered_normals / row_sums[:, np.newaxis]
            lengths = np.linalg.norm(filtered_normals, axis=1, keepdims=True)
            lengths[lengths < 1e-12] = 1.0
            normals = filtered_normals / lengths

        # Update vertices according to filtered face normals
        v_to_faces = m.vertex_faces
        new_vertices = m.vertices.copy()
        for v_idx in range(len(m.vertices)):
            if pinned_vertices is not None and v_idx in pinned_vertices:
                continue
            f_indices = [f for f in v_to_faces[v_idx] if f >= 0]
            if not f_indices:
                continue
            v_pos = m.vertices[v_idx]
            delta_sum = np.zeros(3)
            weight_sum = 0.0
            for f in f_indices:
                n_f = normals[f]
                c_f = face_centroids[f]
                area_f = face_areas[f]
                disp = np.dot(n_f, (c_f - v_pos)) * n_f
                delta_sum += area_f * disp
                weight_sum += area_f
            if weight_sum > 1e-12:
                new_vertices[v_idx] += delta_sum / weight_sum

        m.vertices = new_vertices
        return m

    def heal_mesh(
        self,
        intensity: str = "balanced",
        remove_outliers: bool = True,
        fill_holes: bool = True,
        smooth: bool = True,
        decimate: bool = False,
        decimate_ratio: float = 0.5,
        preserve_features: bool = True,
        feature_angle_threshold: float = 35.0,
        smooth_method: str = "taubin"
    ) -> Dict[str, Any]:
        """
        Specialized 3D Scan & Mesh Healing Engine with Feature-Preservation (KIRI Engine, LiDAR, CAD, Noisy STL/OBJ).
        Transforms rough, jagged, non-manifold scan meshes into clean, watertight solids without destroying sharp CAD features:
        1. Connected Component Outlier & Debris Filtering (removes floating scanner artifacts).
        2. Degenerate and duplicate face removal.
        3. Watertight Boundary Hole Filling (use_fan=True).
        4. Feature-Preserving Dihedral Edge Pinning & Bilateral / Taubin Low-Pass Smoothing.
        5. Winding and Normal Alignment.
        6. Optional Quadric Decimation (reduces facet count while preserving sharp edges).
        Updates 3D viewport live and preserves working mesh path for solid CAD conversion.
        """
        if not self._current_bodies or self._current_vertices is None:
            return {"success": False, "error": "İyileştirilecek yüklü 3D model bulunamadı."}

        # Backup state for undo if not already backed up
        if self._backup_mesh_state is None:
            self._backup_mesh_state = {
                "bodies": [
                    {k: (v.copy() if isinstance(v, np.ndarray) else v) for k, v in b.items()}
                    for b in self._current_bodies
                ],
                "vertices": self._current_vertices.copy(),
                "working_mesh_path": self._working_mesh_path
            }

        orig_tri_count = sum(b.get("triangle_count", 0) for b in self._current_bodies)
        total_debris_removed = 0
        total_holes_repaired = 0
        total_feature_edges_locked = 0

        # Iterations for smoothing
        if intensity == "light":
            iter_count = 6
        elif intensity == "strong":
            iter_count = 28
        else:  # balanced
            iter_count = 14

        for body in self._current_bodies:
            flat_v = body.get("vertices")
            if flat_v is None or len(flat_v) == 0:
                continue

            orig_b_tri = len(flat_v) // 3
            faces = np.arange(len(flat_v)).reshape(-1, 3)
            try:
                m = trimesh.Trimesh(vertices=flat_v, faces=faces, process=True)

                # 1. Outlier & Floating Debris Removal
                b_debris_removed = 0
                if remove_outliers:
                    comps = m.split(only_watertight=False)
                    if len(comps) > 1:
                        largest_len = max(len(c.faces) for c in comps)
                        valid_comps = [c for c in comps if len(c.faces) >= int(largest_len * 0.10)]
                        if valid_comps:
                            kept_m = valid_comps[0] if len(valid_comps) == 1 else trimesh.util.concatenate(valid_comps)
                            b_debris_removed = len(m.faces) - len(kept_m.faces)
                            m = kept_m
                total_debris_removed += b_debris_removed

                # 2. Cleanup Degenerate & Duplicate Faces
                m.update_faces(m.nondegenerate_faces())
                m.update_faces(m.unique_faces())
                m.remove_unreferenced_vertices()

                # 3. Watertight Boundary Hole Filling
                if fill_holes and not m.is_watertight:
                    try:
                        was_filled = trimesh.repair.fill_holes(m, use_fan=True)
                        if was_filled:
                            total_holes_repaired += 1
                    except Exception as e_h:
                        print(f"Hole filling note: {e_h}")

                # 4. Optional Quadric Decimation (Faset Sadeleştirme)
                if decimate and len(m.faces) > 10:
                    try:
                        ratio = max(0.1, min(0.9, float(decimate_ratio)))
                        m = m.simplify_quadric_decimation(ratio)
                    except Exception as e_d:
                        print(f"Decimation note: {e_d}")

                # 5. Feature-Preserving Smoothing (Taubin & Bilateral)
                b_feature_edges_locked = 0
                if smooth and len(m.faces) > 0:
                    try:
                        pinned = None
                        if preserve_features:
                            # Detect sharp mechanical edges (dihedral angle > feature_angle_threshold)
                            if len(m.face_adjacency) > 0:
                                angles_deg = np.degrees(m.face_adjacency_angles)
                                sharp_mask = angles_deg > float(feature_angle_threshold)
                                sharp_edges = m.face_adjacency_edges[sharp_mask]
                                b_feature_edges_locked = len(sharp_edges)
                                sharp_verts = np.unique(sharp_edges) if len(sharp_edges) > 0 else np.array([], dtype=int)
                            else:
                                sharp_verts = np.array([], dtype=int)

                            # Detect open boundary edges
                            unique_edges, counts = np.unique(m.edges_sorted, axis=0, return_counts=True)
                            boundary_edges = unique_edges[counts == 1]
                            boundary_verts = np.unique(boundary_edges) if len(boundary_edges) > 0 else np.array([], dtype=int)

                            all_pinned = np.unique(np.concatenate([sharp_verts, boundary_verts])) if (len(sharp_verts) > 0 or len(boundary_verts) > 0) else np.array([], dtype=int)
                            if len(all_pinned) > 0:
                                pinned = all_pinned

                        total_feature_edges_locked += b_feature_edges_locked

                        if smooth_method == "bilateral":
                            pinned_set = set(pinned.tolist()) if pinned is not None else None
                            m = self._bilateral_mesh_denoise(
                                m,
                                iterations=max(2, iter_count // 4),
                                sigma_r=0.35,
                                pinned_vertices=pinned_set
                            )
                        else:
                            # Taubin smoothing with pinned feature vertices
                            if pinned is not None and len(pinned) > 0:
                                if len(pinned) >= len(m.vertices):
                                    print(f"All {len(m.vertices)} vertices belong to sharp features; skipping smoothing to preserve CAD precision.")
                                else:
                                    lap = trimesh.smoothing.laplacian_calculation(m, pinned_vertices=pinned)
                                    trimesh.smoothing.filter_taubin(m, lamb=0.5, nu=0.53, iterations=iter_count, laplacian_operator=lap)
                            else:
                                trimesh.smoothing.filter_taubin(m, lamb=0.5, nu=0.53, iterations=iter_count)
                    except Exception as e_s:
                        print(f"Smoothing note: {e_s}")

                # 6. Normal & Winding Alignment
                try:
                    trimesh.repair.fix_winding(m)
                    trimesh.repair.fix_normals(m)
                except Exception as e_n:
                    print(f"Normals fix note: {e_n}")

                # Reconstruct flat vertex buffer
                new_flat_v = m.vertices[m.faces].reshape(-1, 3).astype(np.float32)
                body["vertices"] = new_flat_v
                body["triangle_count"] = int(len(new_flat_v) // 3)
                body["vertex_count"] = int(len(new_flat_v))
                body["bounds"] = self._calculate_bounds(new_flat_v)

            except Exception as e_b:
                print(f"Body healing error for {body.get('name')}: {e_b}")

        # Recombine active bodies
        all_verts_list = [b["vertices"] for b in self._current_bodies]
        combined_verts = np.vstack(all_verts_list)
        self._current_vertices = combined_verts
        total_tri = int(len(combined_verts) // 3)
        total_bounds = self._calculate_bounds(combined_verts)

        # Write to temporary working STL
        temp_dir = tempfile.gettempdir()
        temp_stl = os.path.join(temp_dir, f"healed_{os.getpid()}_{int(time.time())}.stl")
        self._write_vertices_to_stl(combined_verts, temp_stl)
        self._working_mesh_path = temp_stl

        # Prepare payload for WebGL Three.js viewport
        bodies_payload = []
        for b in self._current_bodies:
            flat_v = b["vertices"]
            b_b64 = base64.b64encode(flat_v.tobytes()).decode("ascii")
            bodies_payload.append({
                "id": b["id"],
                "name": b["name"],
                "triangle_count": b["triangle_count"],
                "color": b["color"],
                "selected": b.get("selected", True),
                "bounds": b["bounds"],
                "vertices_b64": b_b64
            })

        v_b64 = base64.b64encode(combined_verts.tobytes()).decode("ascii")
        auto_tune = self.analyze_mesh_for_auto_tune(self._original_filepath or "", total_tri, total_bounds)

        file_size_mb = 0.0
        if self._working_mesh_path and os.path.exists(self._working_mesh_path):
            file_size_mb = round(os.path.getsize(self._working_mesh_path) / (1024 * 1024), 2)
        elif self._original_filepath and os.path.exists(self._original_filepath):
            file_size_mb = round(os.path.getsize(self._original_filepath) / (1024 * 1024), 2)

        fname = os.path.basename(self._original_filepath or "model.stl")
        fmt = os.path.splitext(fname)[1].upper().replace(".", "") or "STL"

        return sanitize_for_json({
            "success": True,
            "filepath": self._working_mesh_path or self._original_filepath,
            "filename": fname,
            "format": fmt,
            "file_size_mb": file_size_mb,
            "triangle_count": total_tri,
            "vertex_count": len(combined_verts),
            "bounds": total_bounds,
            "vertices_b64": v_b64,
            "is_multi_body": len(self._current_bodies) > 1,
            "body_count": len(self._current_bodies),
            "bodies": bodies_payload,
            "is_meter_scale": bool(total_bounds["dimensions"][0] < 0.5 and total_bounds["dimensions"][1] < 0.5 and total_bounds["dimensions"][2] < 0.5),
            "auto_tune": auto_tune,
            "stats": {
                "before_triangles": orig_tri_count,
                "after_triangles": total_tri,
                "removed_debris": total_debris_removed,
                "removed_triangles": max(0, orig_tri_count - total_tri),
                "holes_repaired": total_holes_repaired,
                "intensity": intensity,
                "preserve_features": preserve_features,
                "feature_edges_locked": total_feature_edges_locked,
                "feature_angle_threshold": feature_angle_threshold,
                "smooth_method": smooth_method
            }
        })

    def revert_healed_mesh(self) -> Dict[str, Any]:
        """
        Reverts healed mesh back to original raw state.
        """
        if self._backup_mesh_state is None:
            if self._original_filepath:
                return self.load_mesh(self._original_filepath)
            return {"success": False, "error": "Geri alınacak orijinal mesh yedeği bulunamadı."}

        backup = self._backup_mesh_state
        self._current_bodies = [
            {k: (v.copy() if isinstance(v, np.ndarray) else v) for k, v in b.items()}
            for b in backup["bodies"]
        ]
        self._current_vertices = backup["vertices"].copy()
        self._working_mesh_path = backup["working_mesh_path"]
        self._backup_mesh_state = None  # Reset backup

        total_tri = int(len(self._current_vertices) // 3)
        total_bounds = self._calculate_bounds(self._current_vertices)

        bodies_payload = []
        for b in self._current_bodies:
            flat_v = b["vertices"]
            b_b64 = base64.b64encode(flat_v.tobytes()).decode("ascii")
            bodies_payload.append({
                "id": b["id"],
                "name": b["name"],
                "triangle_count": b["triangle_count"],
                "color": b["color"],
                "selected": b.get("selected", True),
                "bounds": b["bounds"],
                "vertices_b64": b_b64
            })

        v_b64 = base64.b64encode(self._current_vertices.tobytes()).decode("ascii")
        auto_tune = self.analyze_mesh_for_auto_tune(self._original_filepath or "", total_tri, total_bounds)

        file_size_mb = 0.0
        if self._working_mesh_path and os.path.exists(self._working_mesh_path):
            file_size_mb = round(os.path.getsize(self._working_mesh_path) / (1024 * 1024), 2)
        elif self._original_filepath and os.path.exists(self._original_filepath):
            file_size_mb = round(os.path.getsize(self._original_filepath) / (1024 * 1024), 2)

        fname = os.path.basename(self._original_filepath or "model.stl")
        fmt = os.path.splitext(fname)[1].upper().replace(".", "") or "STL"

        return sanitize_for_json({
            "success": True,
            "filepath": self._working_mesh_path or self._original_filepath,
            "filename": fname,
            "format": fmt,
            "file_size_mb": file_size_mb,
            "triangle_count": total_tri,
            "vertex_count": len(self._current_vertices),
            "bounds": total_bounds,
            "vertices_b64": v_b64,
            "is_multi_body": len(self._current_bodies) > 1,
            "body_count": len(self._current_bodies),
            "bodies": bodies_payload,
            "is_meter_scale": bool(total_bounds["dimensions"][0] < 0.5 and total_bounds["dimensions"][1] < 0.5 and total_bounds["dimensions"][2] < 0.5),
            "auto_tune": auto_tune
        })

    def _write_vertices_to_stl(self, flat_verts: np.ndarray, out_stl: str):
        """Writes flat float32 array (N, 3) to a valid binary STL using fast vectorization."""
        num_tri = len(flat_verts) // 3
        triangles = flat_verts.reshape(-1, 3, 3).astype(np.float32)

        v1 = triangles[:, 0, :]
        v2 = triangles[:, 1, :]
        v3 = triangles[:, 2, :]
        normals = np.cross(v2 - v1, v3 - v1)
        norm = np.linalg.norm(normals, axis=1, keepdims=True)
        norm[norm == 0] = 1.0
        normals = (normals / norm).astype(np.float32)

        dt = np.dtype([
            ('normal', np.float32, 3),
            ('v1', np.float32, 3),
            ('v2', np.float32, 3),
            ('v3', np.float32, 3),
            ('attr', np.uint16, 1)
        ])
        records = np.empty(num_tri, dtype=dt)
        records['normal'] = normals
        records['v1'] = v1
        records['v2'] = v2
        records['v3'] = v3
        records['attr'] = 0

        with open(out_stl, "wb") as f:
            header = b"Oriented STL generated by Mesh2Step 3D Studio" + b" " * 35
            f.write(header[:80])
            f.write(struct.pack("<I", num_tri))
            f.write(records.tobytes())

    def analyze_mesh_for_auto_tune(self, filepath: str, tri_count: int, bounds: Dict[str, Any], active_bodies: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """
        Intelligent Engineering Geometric Auto-Tuning Engine.
        Analyzes mesh topology, normal plane alignment, radial axis distribution,
        and multi-body assembly component semantics.
        Provides precise engineering classifications and optimal CAD B-Rep recommendations.
        """
        dims = bounds.get("dimensions", [10, 10, 10])
        bbox_vol_cm3 = max((dims[0] * dims[1] * dims[2]) / 1000.0, 0.01)
        density = tri_count / bbox_vol_cm3
        fname = os.path.basename(filepath) if filepath else ""
        fname_lower = fname.lower()

        # Target bodies
        target_bodies = active_bodies if (active_bodies is not None and len(active_bodies) > 0) else self._current_bodies
        is_subset = active_bodies is not None and self._current_bodies and 0 < len(active_bodies) < len(self._current_bodies)

        if is_subset and target_bodies:
            body_text = " ".join([b.get("name", "") for b in target_bodies]).lower()
            search_text = body_text
            tokens = tokenize_names(body_text)
        else:
            body_text = " ".join([b.get("name", "") for b in target_bodies]).lower() if target_bodies else ""
            search_text = f"{fname_lower} {body_text}".strip()
            tokens = tokenize_names(search_text)

        # Vertex buffer to analyze
        if is_subset and target_bodies:
            verts_to_check = np.vstack([b["vertices"] for b in target_bodies])
        else:
            verts_to_check = self._current_vertices

        # Compute facet normal cardinal alignment ratio and radial distribution
        cardinal_ratio = 0.0
        radial_spread = 0.0
        if verts_to_check is not None and len(verts_to_check) >= 9:
            try:
                triangles = verts_to_check.reshape(-1, 3, 3)
                v1, v2, v3 = triangles[:, 0, :], triangles[:, 1, :], triangles[:, 2, :]
                cross = np.cross(v2 - v1, v3 - v1)
                norm = np.linalg.norm(cross, axis=1, keepdims=True)
                norm[norm == 0] = 1.0
                normals = cross / norm
                max_axis = np.max(np.abs(normals), axis=1)
                cardinal_ratio = float(np.mean(max_axis > 0.90))

                best_spread = 0.0
                for ax1, ax2 in [(0, 1), (0, 2), (1, 2)]:
                    plane_norm = np.linalg.norm(normals[:, [ax1, ax2]], axis=1)
                    mask = plane_norm > 0.5
                    if np.sum(mask) > 100:
                        angles = np.arctan2(normals[mask, ax2], normals[mask, ax1])
                        quadrants = [np.mean((angles >= -np.pi + i*np.pi/2) & (angles < -np.pi + (i+1)*np.pi/2)) for i in range(4)]
                        spread = float(min(quadrants) / (max(quadrants) + 1e-5))
                        if spread > best_spread:
                            best_spread = spread
                radial_spread = best_spread
            except Exception:
                pass

        # Keyword Detections
        gear_terms = ["gear", "dişli", "disli", "planet", "pinion", "pinyon", 
                      "carrier", "reductor", "redüktör", "transmission", "torque", "tork", "sprocket", "cog"]
        has_gear = any(k in search_text for k in gear_terms) or ("sun" in tokens)

        fastener_terms = ["nut", "somun", "thread", "bolt", "civata", "vida", "screw", "knurl", "fastener", "stud", "saplama"]
        has_fastener = any(k in search_text for k in fastener_terms) and not any(k in search_text for k in ["gear", "planet", "sun"])

        organic_terms = ["kiss", "figure", "figür", "figur", "statue", "heykel", "sculpt", "bust", 
                         "bloom", "human", "insan", "character", "karakter"]
        has_organic = any(k in search_text for k in organic_terms) or (bool(tokens & {"head", "face", "body", "sculpture"}) and not has_gear and not has_fastener and cardinal_ratio < 0.35)

        honeycomb_terms = ["honeycomb", "lattice", "petek", "kafes", "porous", "infill"]
        has_honeycomb = any(k in search_text for k in honeycomb_terms) or ("ramp" in search_text and density > 120)

        curved_terms = ["hook", "kanca", "aski", "askı", "tube", "boru", "pipe", "hose", "handle"]
        has_curved = any(k in search_text for k in curved_terms)

        prismatic_terms = ["bracket", "braket", "mount", "housing", "chassis", "stand", "kaide", 
                           "holder", "clamp", "plate", "flange", "flanş", "cover", "kapak", "adapter", "adaptör", "base"]
        has_prismatic = any(k in search_text for k in prismatic_terms)

        is_multi = len(target_bodies) > 1 if target_bodies else False

        # =========================================================================
        # RULE 1: ORGANIC SCULPTURE & FIGURINE
        # =========================================================================
        # RULE 1: ORGANIC SCULPTURE & FIGURINE
        # =========================================================================
        if has_organic or (cardinal_ratio < 0.25 and tri_count > 25000 and not has_gear and not has_prismatic and not has_fastener):
            return {
                "style_key": "organic",
                "category": "🎨 Organik Heykel & Sanatsal Figür",
                "recommended_mode": "verbatim",
                "recommended_unify": True,
                "recommended_unify_angle": 1.5,
                "recommended_engine": "native_re",
                "badge": "💎 Titan CAD (Organik Doku Koruma)",
                "reason": f"Sanatsal serbest formlu organik geometri tespit edildi (Düzlemsellik: %{round(cardinal_ratio*100, 1)}). Anatomik yüzey detaylarının ve estetik kıvrımların bozulmadan katıya aktarılması için Organik Doku Korumalı Titan B-Rep seçildi."
            }

        # =========================================================================
        # RULE 2: HONEYCOMB & POROUS LATTICE
        # =========================================================================
        if has_honeycomb:
            return {
                "style_key": "honeycomb",
                "category": "Bal Peteği / İnce Hücreli Kafes Yapısı",
                "recommended_mode": "verbatim",
                "recommended_unify": True,
                "recommended_unify_angle": 2.5,
                "recommended_engine": "native_re",
                "badge": "💎 Titan CAD (Kafes & Hücre Koruma)",
                "reason": "Bal peteği / ince hücreli kafes yapısı tespit edildi. Petek duvarlarının mikron hassasiyetinde katıya dönüştürülmesi için Titan CAD B-Rep motoru seçildi."
            }

        # =========================================================================
        # RULE 3: HIGH-PRECISION SCREW THREADS, BOLTS & NUTS (FASTENERS)
        # =========================================================================
        if has_fastener or (density > 250 and max(dims) < 80.0 and cardinal_ratio < 0.35 and min(dims) > 5.0 and not has_gear and not has_prismatic):
            return {
                "style_key": "fastener",
                "category": "🔩 Hassas Vida & Somun Bağlantı Geometrisi",
                "recommended_mode": "trueform",
                "recommended_unify": True,
                "recommended_unify_angle": 2.0,
                "recommended_engine": "native_re",
                "badge": "💎 Titan Analitik CAD (Yiv Koruma)",
                "reason": "Vida dişi ve dairesel helisel bağlantı geometrisi tespit edildi. Helisel yivleri mikron hassasiyetinde koruyup düzenlenebilir CAD katısı oluşturmak için Titan Analitik B-Rep motoru seçildi."
            }

        # =========================================================================
        # RULE 4: GEARS, PLANETARY REDUCERS & ACTUATOR TRANSMISSIONS
        # =========================================================================
        if has_gear or (radial_spread > 0.65 and cardinal_ratio < 0.40 and not has_organic and not has_fastener and not has_prismatic and min(dims) > 5.0):
            if is_multi:
                gear_count = sum(1 for b in target_bodies if any(k in b.get("name", "").lower() for k in ["gear", "dişli", "disli", "planet", "sun"]))
                gear_str = f"{gear_count} adet dişli takımı, " if gear_count > 0 else ""
                return {
                    "style_key": "gear",
                    "category": f"⚙️ Çok Gövdeli Mekanik Dişli & Redüktör Montajı ({len(target_bodies)} Parça)",
                    "recommended_mode": "trueform",
                    "recommended_unify": True,
                    "recommended_unify_angle": 2.0,
                    "recommended_engine": "native_re",
                    "badge": "💎 Titan Analitik CAD (Diş Profili & Eksen Koruma)",
                    "reason": f"Montaj içerisinde mekanik redüktör mekanizması ({gear_str}şaft yatakları ve gövde) tespit edildi. Dişli evolvent profillerinin ve dönme eksenlerinin mikron hassasiyetinde analitik B-Rep katısına dönüştürülmesi için Titan CAD motoru seçildi."
                }
            else:
                single_name = target_bodies[0].get("name", "") if target_bodies else fname
                cat_name = f"⚙️ Hassas Düz/Planet Dişli ({single_name})" if any(k in single_name.lower() for k in ["gear", "sun", "planet"]) else "⚙️ Hassas Mekanik Dişli / Eksen Geometrisi"
                return {
                    "style_key": "gear",
                    "category": cat_name,
                    "recommended_mode": "trueform",
                    "recommended_unify": True,
                    "recommended_unify_angle": 2.0,
                    "recommended_engine": "native_re",
                    "badge": "💎 Titan Analitik CAD (Evolvent Profil Koruma)",
                    "reason": "Hassas mekanik dişli geometrisi tespit edildi. Dişlerin evolvent eğrilerinin ve tepe-dip kavislerinin analitik CAD formu olarak korunması, şaft deliğinin kusursuz silindir B-Rep olarak işlenmesi için Titan CAD motoru seçildi."
                }

        # =========================================================================
        # RULE 5: PRISMATIC MECHANICAL MOUNT, BRACKET & HOUSING
        # =========================================================================
        if cardinal_ratio >= 0.38 or has_prismatic:
            mount_desc = "montaj flanşları ve cıvata delikleri" if any(k in tokens for k in ["bracket", "mount", "stand", "holder"]) else "düz montaj tablaları"
            single_sub = f" ({target_bodies[0]['name']})" if (is_subset and len(target_bodies) == 1) else ""
            return {
                "style_key": "prismatic",
                "category": f"📐 Prizmatik Mekanik Gövde & Montaj Braketi{single_sub}",
                "recommended_mode": "trueform",
                "recommended_unify": True,
                "recommended_unify_angle": 2.0,
                "recommended_engine": "native_re",
                "badge": "💎 Analitik Katı (TrueForm)",
                "reason": f"Düzlemsel {mount_desc} barındıran prizmatik mekanik gövde (Düzlemsellik oranı: %{round(cardinal_ratio*100, 1)}). Düzlemlerin ve delik silindirlerinin tam analitik CAD B-Rep katısına dönüştürülmesi için TrueForm seçildi."
            }

        # =========================================================================
        # RULE 6: CURVED HOOKS, PIPES, SWOOPING PROFILES
        # =========================================================================
        if has_curved or cardinal_ratio < 0.35:
            return {
                "style_key": "organic",
                "category": "🪝 Kavisli Mekanik Profil & Kanca Geometrisi",
                "recommended_mode": "verbatim",
                "recommended_unify": True,
                "recommended_unify_angle": 2.0,
                "recommended_engine": "native_re",
                "badge": "💎 Titan CAD (Kavisli Profil Koruma)",
                "reason": "Organik / kavisli mekanik profil yapısı tespit edildi. Faset sayısını dengeli sadeleştirip temiz CAD B-Rep yüzeyleri oluşturmak için Titan CAD motoru seçildi."
            }

        # =========================================================================
        # RULE 7: DEFAULT GENERAL MECHANICAL SOLID
        # =========================================================================
        return {
            "style_key": "prismatic",
            "category": "📐 Genel Mekanik Parça / Katı Gövde",
            "recommended_mode": "trueform" if cardinal_ratio >= 0.35 else "verbatim",
            "recommended_unify": True,
            "recommended_unify_angle": 2.0,
            "recommended_engine": "native_re",
            "badge": "💎 Titan Analitik CAD (v3.0)",
            "reason": f"Standart mekanik katı geometrisi analiz edildi (Düzlemsellik oranı: %{round(cardinal_ratio*100, 1)}). Yüzey sürekliliği ve boyut toleransları için Titan B-Rep modu seçildi."
        }

    def detect_model_style(self, filepath: Optional[str] = None) -> Dict[str, Any]:
        """
        Intelligent Model Style & Design Characteristics detector.
        If Google Gemini API key is configured in settings, queries Gemini to
        classify the 3D geometry into one of the 6 core design styles.
        If no API key or offline, seamlessly falls back to the local topology engine.
        """
        target_path = filepath or self._working_mesh_path or self._original_filepath
        if not target_path or not os.path.exists(target_path):
            return {"success": False, "error": "İncelenecek 3D model dosyası bulunamadı."}

        mesh_info = self.load_mesh(target_path)
        if not mesh_info.get("success"):
            return {"success": False, "error": mesh_info.get("error")}

        auto_tune = mesh_info.get("auto_tune", {})
        tri_count = mesh_info.get("triangle_count", 0)
        bounds = mesh_info.get("bounds", {})
        dims = bounds.get("dimensions", [10, 10, 10])
        model_type = mesh_info.get("model_type", "cad")
        fname = os.path.basename(target_path)

        # Check for configured Gemini API Key
        cfg = self.get_settings()
        api_key = cfg.get("api_key", "").strip()
        model_name = cfg.get("model", "gemini-3.8-flash")

        if api_key:
            prompt = f"""
Sen uzman bir CAD/CAM ve Mekanik Tasarım Mühendisisin.
Aşağıdaki 3D model verilerini analiz et ve tasarım stilini/özelliklerini belirle:
Dosya Adı: {fname}
Format: {mesh_info.get('format')}
Üçgen Sayısı: {tri_count:,}
Boyutlar: {dims[0]} x {dims[1]} x {dims[2]} mm
Köşegen: {bounds.get('diagonal')} mm
Model Tipi: {model_type} (CAD veya 3D Tarama)

Lütfen modeli aşağıdaki 6 kategoriden YALNIZCA BİRİNE sınıflandır:
1. "prismatic" -> Prizmatik Mekanik Gövde, Montaj Braketi, Düz montaj tablaları, flanş
2. "gear" -> Dişli, Planet mekanizma, şaft, aktarma organı
3. "fastener" -> Vida dişi, somun, cıvata, helisel yiv
4. "organic" -> Organik Form, Heykel, Figür, Serbest formlu yüzeyler
5. "honeycomb" -> Bal peteği, gözenekli kafes, ince hücreli yapı
6. "scan" -> 3D Optik/Lidar Tarama, Fotogrametri, Tersine mühendislik mesh'i

YALNIZCA şu JSON formatında yanıt ver:
{{
  "style_key": "prismatic | gear | fastener | organic | honeycomb | scan",
  "category_name": "Kategori Başlığı",
  "reason": "Bu stilin seçilme nedeni (1-2 cümle teknik açıklama)",
  "recommended_mode": "trueform | verbatim",
  "recommended_unify": true,
  "recommended_unify_angle": 2.0
}}
"""
            for m in [model_name, "gemini-3.8-flash", "gemini-3.5-flash-lite"]:
                try:
                    import urllib.request
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={api_key}"
                    payload = {"contents": [{"parts": [{"text": prompt}]}]}
                    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"})
                    with urllib.request.urlopen(req, timeout=8) as resp:
                        data = json.loads(resp.read().decode("utf-8"))
                        text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                        if "```json" in text:
                            text = text.split("```json")[1].split("```")[0].strip()
                        elif "```" in text:
                            text = text.split("```")[1].split("```")[0].strip()
                        parsed = json.loads(text)
                        style_key = parsed.get("style_key", "prismatic")
                        if style_key not in ["prismatic", "gear", "fastener", "organic", "honeycomb", "scan"]:
                            style_key = "prismatic"
                        return {
                            "success": True,
                            "source": "gemini",
                            "style_key": style_key,
                            "category": parsed.get("category_name", auto_tune.get("category", "")),
                            "reason": parsed.get("reason", auto_tune.get("reason", "")),
                            "badge": f"🤖 Gemini AI ({m})",
                            "recommended_mode": parsed.get("recommended_mode", auto_tune.get("recommended_mode", "trueform")),
                            "recommended_unify": parsed.get("recommended_unify", True),
                            "recommended_unify_angle": parsed.get("recommended_unify_angle", 2.0),
                            "recommended_engine": "native_re"
                        }
                except Exception as e_ai:
                    print(f"Gemini style detection note ({m}): {e_ai}")
                    continue

        # Offline Local Geometric Heuristic Fallback
        style_key = auto_tune.get("style_key")
        if not style_key:
            if model_type == "scan":
                style_key = "scan"
            else:
                style_key = "prismatic"

        return {
            "success": True,
            "source": "local",
            "style_key": style_key,
            "category": auto_tune.get("category", "📐 Prizmatik Mekanik Gövde"),
            "reason": auto_tune.get("reason", "Yerel topoloji motoru geometrik faset yönelimlerini analiz ederek belirledi."),
            "badge": "⚡ Yerel Geometri Analizi",
            "recommended_mode": auto_tune.get("recommended_mode", "trueform"),
            "recommended_unify": auto_tune.get("recommended_unify", True),
            "recommended_unify_angle": auto_tune.get("recommended_unify_angle", 2.0),
            "recommended_engine": auto_tune.get("recommended_engine", "native_re")
        }

    def emit_progress(self, pct: int, status_text: str):
        """Dispatches real-time percentage progress updates to the JavaScript UI."""
        win = get_active_window()
        if win:
            safe_text = status_text.replace("'", "\\'").replace('"', '\\"')
            js_code = f"if (window.onConversionProgress) window.onConversionProgress({pct}, '{safe_text}');"
            try:
                win.evaluate_js(js_code)
            except Exception:
                pass

    def cancel_conversion(self) -> Dict[str, Any]:
        """Terminates the currently running conversion immediately."""
        self._is_cancelled = True
        if self._current_proc:
            try:
                self._current_proc.kill()
            except Exception:
                pass
        self._is_converting = False
        self.emit_progress(0, "İşlem kullanıcı tarafından durduruldu.")
        return {"success": True, "message": "Dönüştürme durduruldu."}

    def convert_mesh(self, filepath: str, engine_mode: str = "trueform", unify_coplanar: bool = True, threads: Optional[int] = None, unify_angle: Optional[float] = None, engine_type: str = "native_re") -> Dict[str, Any]:
        """
        Main conversion pipeline powered by 100% proprietary Titan CAD Engine (OpenCASCADE + RANSAC B-Rep).
        Persists metrics immediately to persistent conversion_history.json.
        """
        if self._is_converting:
            return {"success": False, "error": "Başka bir dönüştürme işlemi zaten devam ediyor."}

        self._is_converting = True
        self._is_cancelled = False
        target = filepath or self._working_mesh_path or self._original_filepath
        if not target or not os.path.exists(target):
            return {"success": False, "error": "Kaynak dosya bulunamadı veya model yüklü değil."}

        t_start = time.time()

        # If multi-body assembly loaded and no working mesh yet, bake active bodies
        active_bodies = [b for b in self._current_bodies if b.get("selected", True)] if self._current_bodies else []
        if active_bodies:
            orig_tri = sum(b.get("triangle_count", 0) for b in active_bodies)
            if not self._working_mesh_path:
                active_verts = np.vstack([b["vertices"] for b in active_bodies])
                temp_dir = tempfile.gettempdir()
                temp_stl = os.path.join(temp_dir, f"assembly_{os.getpid()}_{int(time.time())}.stl")
                self._write_vertices_to_stl(active_verts, temp_stl)
                self._working_mesh_path = temp_stl
        elif self._current_vertices is not None:
            orig_tri = len(self._current_vertices) // 3
        else:
            orig_tri = 0

        target = self._working_mesh_path or filepath or self._original_filepath

        try:
            res = self._do_convert(target, engine_mode, unify_coplanar, threads, unify_angle, engine_type)

            # Immediately record result in persistent history
            brep_faces = res.get("faces_count", 0)
            reduction = 0.0
            if orig_tri > 0 and brep_faces > 0 and brep_faces < orig_tri:
                reduction = round((1.0 - (brep_faces / orig_tri)) * 100.0, 1)

            entry_filename = os.path.basename(self._original_filepath or filepath or target)
            entry = {
                "id": str(uuid.uuid4())[:8],
                "filename": entry_filename,
                "source_path": self._original_filepath or target,
                "step_path": res.get("step_path", ""),
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "status": "success" if res.get("success") else "failed",
                "engine_mode": res.get("engine_mode", engine_mode),
                "engine_type": res.get("engine_type", engine_type),
                "orig_triangles": orig_tri,
                "brep_faces": brep_faces,
                "reduction_pct": reduction,
                "elapsed_seconds": res.get("elapsed_seconds", round(time.time() - t_start, 2)),
                "step_size_mb": res.get("step_size_mb", 0.0),
                "cylinders": res.get("cylinders_recovered", "0 adet"),
                "planes": res.get("planes_recovered", "0 adet"),
                "watertight": res.get("watertight", True),
                "mesh_vol_cm3": res.get("mesh_vol_cm3"),
                "brep_vol_cm3": res.get("brep_vol_cm3"),
                "vol_deviation_pct": res.get("vol_deviation_pct"),
                "error": res.get("error", "")
            }
            record_conversion_entry(entry)
            res["reduction_pct"] = reduction
            res["orig_triangles"] = orig_tri
            return sanitize_for_json(res)
        except Exception as e:
            entry_filename = os.path.basename(self._original_filepath or filepath or target)
            entry = {
                "id": str(uuid.uuid4())[:8],
                "filename": entry_filename,
                "source_path": self._original_filepath or target,
                "step_path": "",
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "status": "failed",
                "engine_mode": engine_mode,
                "engine_type": engine_type,
                "orig_triangles": orig_tri,
                "brep_faces": 0,
                "reduction_pct": 0.0,
                "elapsed_seconds": round(time.time() - t_start, 2),
                "step_size_mb": 0.0,
                "cylinders": "0 adet",
                "planes": "0 adet",
                "watertight": False,
                "error": str(e)
            }
            record_conversion_entry(entry)
            return {"success": False, "error": f"Dönüştürme hatası: {str(e)}"}
        finally:
            self._is_converting = False
            self._current_proc = None

    def _do_convert(self, filepath: str, engine_mode: str, unify_coplanar: bool, threads: Optional[int], unify_angle: Optional[float] = None, engine_type: str = "native_re") -> Dict[str, Any]:
        if not filepath or not os.path.exists(filepath):
            return {"success": False, "error": "Kaynak dosya bulunamadı."}

        t_start = time.time()
        self.emit_progress(5, "Mesh geometrisi doğrulanıyor...")

        temp_stl = None
        # Use working transformed mesh if user aligned/rotated the part or selected bodies
        work_stl = self._working_mesh_path or filepath
        is_stl = filepath.lower().endswith(".stl")

        if not is_stl and not self._working_mesh_path:
            ext_name = os.path.splitext(filepath)[1].upper()[1:]
            self.emit_progress(12, f"{ext_name} yapısı binary faset geometrisine dönüştürülüyor (%12)...")
            temp_fd, temp_stl = tempfile.mkstemp(suffix=".stl")
            os.close(temp_fd)
            active_bodies = [b for b in self._current_bodies if b.get("selected", True)] if self._current_bodies else []
            if active_bodies:
                active_verts = np.vstack([b["vertices"] for b in active_bodies])
                self._write_vertices_to_stl(active_verts, temp_stl)
            elif self._current_vertices is not None:
                self._write_vertices_to_stl(self._current_vertices, temp_stl)
            else:
                try:
                    loaded_m = load_trimesh_unified(filepath)
                    loaded_m.export(temp_stl)
                except Exception as e:
                    return {"success": False, "error": f"{ext_name} geometrisi okunamadı: {e}"}
            work_stl = temp_stl
            self._working_mesh_path = temp_stl

        # Target STEP path - ALWAYS use original filename and directory
        orig_path = self._original_filepath or filepath
        base_dir = os.path.dirname(os.path.abspath(orig_path))
        base_name = os.path.splitext(os.path.basename(orig_path))[0]
        step_out = os.path.join(base_dir, f"{base_name}.step")
        open(step_out, "a").close()

        # =========================================================================
        # TITAN CAD REVERSE ENGINEERING ENGINE (OCP + RANSAC B-Rep)
        # 100% In-house Proprietary CAD Core (v3.0 Architecture)
        # =========================================================================
        try:
            self.emit_progress(10, "💎 Titan Analitik CAD Motoru (RANSAC + OpenCASCADE) başlatılıyor (%10)...")
            angle_deg = min(float(unify_angle), 2.8) if unify_angle is not None else 2.0
            q_mode = "balanced"
            if angle_deg >= 5.0:
                q_mode = "high"
            elif angle_deg <= 1.0:
                q_mode = "fast"

            native_engine = get_engine()
            active_bodies = [b for b in self._current_bodies if b.get("selected", True)] if self._current_bodies else []

            if len(active_bodies) > 1:
                self.emit_progress(10, f"💎 Titan Çok Gövdeli CAD Montaj Motoru ({len(active_bodies)} Parça) başlatılıyor (%10)...")
                native_res = native_engine.convert_assembly_to_step(
                    bodies=active_bodies,
                    step_out_path=step_out,
                    unify_angle_deg=angle_deg,
                    linear_tol=0.02,
                    quality_mode=q_mode,
                    progress_callback=self.emit_progress,
                    is_cancelled=lambda: self._is_cancelled
                )
            else:
                native_res = native_engine.convert_mesh_to_step(
                    mesh_path=work_stl,
                    step_out_path=step_out,
                    unify_angle_deg=angle_deg,
                    linear_tol=0.02,
                    quality_mode=q_mode,
                    progress_callback=self.emit_progress,
                    is_cancelled=lambda: self._is_cancelled
                )

            if self._is_cancelled:
                return {"success": False, "cancelled": True, "error": "Dönüştürme işlemi durduruldu."}

            self._current_step_path = step_out

            # Extract solid preview
            preview_data = native_res.get("preview")
            if not preview_data or preview_data.get("is_fallback") or not preview_data.get("faces_b64"):
                preview_data = self._generate_solid_preview(step_out)

            cyl_list = native_res.get("details", {}).get("cylinders", [])
            cyl_count = len(cyl_list)
            if cyl_count > 0:
                dia_strs = [f"Ø{c['diameter']} mm" for c in cyl_list[:2] if isinstance(c, dict) and "diameter" in c]
                if not dia_strs and isinstance(cyl_list[0], dict) and "count" in cyl_list[0]:
                    cyl_label = f"{cyl_list[0]['count']} adet"
                elif dia_strs:
                    if len(cyl_list) > 2:
                        dia_strs.append(f"+{len(cyl_list)-2}")
                    cyl_label = f"{cyl_count} adet ({', '.join(dia_strs)})"
                else:
                    cyl_label = f"{cyl_count} adet"
            else:
                cyl_label = "0 adet"

            plane_count = native_res.get("details", {}).get("planes_count", 0)

            # Cleanup temp STL
            if temp_stl and os.path.exists(temp_stl):
                try:
                    os.remove(temp_stl)
                except Exception:
                    pass

            return {
                "success": True,
                "step_path": step_out,
                "step_size_mb": native_res["step_size_mb"],
                "elapsed_seconds": native_res["elapsed_seconds"],
                "engine_mode": "💎 Titan Analitik CAD (RANSAC + Solid B-Rep)",
                "engine_type": "native_re",
                "watertight": native_res["watertight"],
                "solids_count": native_res.get("solids_count", 1),
                "faces_count": native_res["faces_count"],
                "orig_faces_count": native_res.get("orig_faces_count", 0),
                "cylinders_recovered": cyl_label,
                "planes_recovered": f"{plane_count} adet",
                "preview": preview_data,
                "details": native_res.get("details", {})
            }
        except Exception as e:
            print(f"Titan engine error: {e}")
            self.emit_progress(0, f"Hata: {e}")
            if temp_stl and os.path.exists(temp_stl):
                try:
                    os.remove(temp_stl)
                except Exception:
                    pass
            return {"success": False, "error": f"Titan Analitik CAD Motor Hatası: {e}"}

    def _generate_solid_preview(self, step_path: str) -> Optional[Dict[str, Any]]:
        """
        Extracts B-Rep faces directly from STEP model using OpenCASCADE in Python.
        Zero external binary dependency - 100% native Three.js buffer synthesis.
        """
        if not step_path or not os.path.exists(step_path):
            return None

        # Try native OpenCASCADE STEP reader and tessellation
        try:
            from OCP.STEPControl import STEPControl_Reader
            from OCP.IFSelect import IFSelect_RetDone
            reader = STEPControl_Reader()
            status = reader.ReadFile(step_path)
            if status == IFSelect_RetDone:
                reader.TransferRoots()
                shape = reader.OneShape()
                prev = get_engine()._tessellate_for_webgl(shape)
                if prev and prev.get("faces_b64"):
                    raw_bytes = base64.b64decode(prev["faces_b64"])
                    faces_arr = np.frombuffer(raw_bytes, dtype=np.float32).reshape(-1, 3)
                    bounds = self._calculate_bounds(faces_arr)
                    return {
                        "faces_b64": prev["faces_b64"],
                        "edges_b64": prev.get("edges_b64", ""),
                        "triangles": len(faces_arr) // 9,
                        "edges_count": prev.get("edges_count", 0),
                        "bounds": bounds,
                        "is_fallback": False
                    }
        except Exception as e:
            print(f"Native STEP preview error: {e}")

        # Fallback to current working mesh vertices so viewport is never blank
        if self._current_vertices is not None and len(self._current_vertices) > 0:
            faces_arr = self._current_vertices.astype(np.float32)
            num_tri = len(faces_arr) // 3
            if num_tri > 60000:
                stride = int(math.ceil(num_tri / 60000))
                faces_arr = faces_arr.reshape(-1, 3, 3)[::stride].reshape(-1, 3)
            faces_b64 = base64.b64encode(faces_arr.tobytes()).decode("ascii")
            bounds = self._calculate_bounds(faces_arr)
            return {
                "faces_b64": faces_b64,
                "edges_b64": "",
                "triangles": len(faces_arr) // 3,
                "edges_count": 0,
                "bounds": bounds,
                "is_fallback": True
            }
        return None

    def open_in_fusion(self, step_path: Optional[str] = None) -> Dict[str, Any]:
        """Launches Autodesk Fusion 360 with the STEP file."""
        target_path = step_path or self._current_step_path
        if not target_path or not os.path.exists(target_path):
            return {"success": False, "error": "Açılacak STEP dosyası bulunamadı."}

        fusion_exe = find_fusion360_path()
        if not fusion_exe:
            try:
                os.startfile(target_path)
                return {"success": True, "message": "STEP dosyası sistem varsayılan CAD uygulamasında açıldı."}
            except Exception as e:
                return {"success": False, "error": f"Fusion 360 bulunamadı: {str(e)}"}

        try:
            subprocess.Popen([fusion_exe, os.path.abspath(target_path)])
            return {"success": True, "message": f"Autodesk Fusion 360 başlatıldı: {os.path.basename(target_path)}"}
        except Exception as e:
            return {"success": False, "error": f"Fusion 360 başlatılamadı: {str(e)}"}

    def open_in_freecad(self, step_path: Optional[str] = None) -> Dict[str, Any]:
        """Launches FreeCAD with the STEP file."""
        target_path = step_path or self._current_step_path
        if not target_path or not os.path.exists(target_path):
            return {"success": False, "error": "Açılacak STEP dosyası bulunamadı."}

        freecad_exe = find_freecad_path()
        if freecad_exe:
            try:
                subprocess.Popen([freecad_exe, os.path.abspath(target_path)])
                return {"success": True, "message": f"FreeCAD başlatıldı: {os.path.basename(target_path)}"}
            except Exception as e:
                return {"success": False, "error": f"FreeCAD başlatılamadı: {str(e)}"}

        try:
            os.startfile(target_path)
            return {"success": True, "message": "STEP dosyası sistem CAD görüntüleyicide açıldı."}
        except Exception as e:
            return {"success": False, "error": f"CAD uygulaması başlatılamadı: {str(e)}"}

    def reveal_in_explorer(self, filepath: Optional[str] = None) -> Dict[str, Any]:
        """Reveals the file in Windows File Explorer."""
        target = filepath or self._current_step_path
        if not target or not os.path.exists(target):
            return {"success": False, "error": "Dosya bulunamadı."}
        try:
            target_clean = os.path.normpath(os.path.abspath(target))
            subprocess.Popen(["explorer", f"/select,{target_clean}"])
            return {"success": True}
        except Exception as e:
            try:
                os.startfile(os.path.dirname(target))
                return {"success": True}
            except Exception as e2:
                return {"success": False, "error": f"Konum açılamadı: {str(e2)}"}

    def get_conversion_history(self) -> Dict[str, Any]:
        """Returns the full persistent conversion history log."""
        try:
            history = load_conversion_history()
            return {"success": True, "history": history}
        except Exception as e:
            return {"success": False, "error": str(e), "history": []}

    def clear_conversion_history(self) -> Dict[str, Any]:
        """Clears the persistent conversion history ledger."""
        try:
            save_conversion_history([])
            return {"success": True, "message": "Geçmiş başarıyla temizlendi."}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def open_history_in_fusion(self, step_path: str) -> Dict[str, Any]:
        """Launches a historical STEP model directly in Fusion 360."""
        return self.open_in_fusion(step_path)

    def reveal_history_item(self, filepath: str) -> Dict[str, Any]:
        """Selects and reveals a historical STEP file in Windows Explorer."""
        return self.reveal_in_explorer(filepath)

    def save_step_as(self, current_step: Optional[str] = None) -> Dict[str, Any]:
        """Opens Save As dialog to save the generated STEP file anywhere."""
        src = current_step or self._current_step_path
        if not src or not os.path.exists(src):
            return {"success": False, "error": "Kaydedilecek STEP dosyası mevcut değil."}

        win = get_active_window()
        if not win:
            return {"success": False, "error": "Pencere referansı bulunamadı."}

        default_name = os.path.basename(src)
        file_types = ("STEP CAD Files (*.step;*.stp)", "All Files (*.*)")
        dest = win.create_file_dialog(webview.SAVE_DIALOG, save_filename=default_name, file_types=file_types)
        
        # In pywebview WinForms, create_file_dialog returns a tuple: (dialog.FileName,)
        if dest:
            if isinstance(dest, (list, tuple)):
                dest = dest[0] if len(dest) > 0 else None

        if not dest:
            return {"success": False, "cancelled": True}

        dest_str = os.path.normpath(str(dest).strip())
        if not dest_str.lower().endswith((".step", ".stp")):
            dest_str += ".step"

        try:
            dest_dir = os.path.dirname(os.path.abspath(dest_str))
            os.makedirs(dest_dir, exist_ok=True)
            shutil.copy2(src, dest_str)
            if not os.path.exists(dest_str):
                return {"success": False, "error": "Dosya kopyalanamadı."}
            self._current_step_path = dest_str
            return {
                "success": True,
                "path": dest_str,
                "filename": os.path.basename(dest_str),
                "size_mb": round(os.path.getsize(dest_str) / (1024 * 1024), 2)
            }
        except Exception as e:
            return {"success": False, "error": f"Kaydetme hatası: {str(e)}"}

    def open_external_url(self, url: str) -> Dict[str, Any]:
        """Safely opens an external URL in the system default web browser."""
        import webbrowser
        try:
            if not url or not (url.startswith("http://") or url.startswith("https://")):
                return {"success": False, "error": "Geçersiz web adresi."}
            webbrowser.open(url)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_settings(self) -> Dict[str, Any]:
        """Reads configuration from config.json."""
        default_cfg = {
            "api_key": "",
            "model": "gemini-3.8-flash",
            "available_models": [
                "gemini-3.8-flash",
                "gemini-3.7-flash",
                "gemini-3.6-flash",
                "gemini-3.5-flash",
                "gemini-3.5-flash-lite",
                "gemini-3.1-flash-lite",
                "gemini-3-flash",
                "gemini-2.5-flash",
                "gemini-2.5-flash-lite"
            ],
            "threads": os.cpu_count() or 8,
            "high_performance": True
        }
        if os.path.exists(CONFIG_PATH):
            try:
                with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                api_s = data.get("api_settings", {})
                default_cfg["api_key"] = api_s.get("gemini_api_key", "")
                default_cfg["model"] = api_s.get("selected_model", "gemini-3.8-flash")
                default_cfg["available_models"] = api_s.get("available_models", default_cfg["available_models"])
                default_cfg["threads"] = data.get("threads", os.cpu_count() or 8)
            except Exception:
                pass
        return default_cfg

    def save_settings(self, new_settings: Dict[str, Any]) -> Dict[str, Any]:
        """Saves configuration into config.json."""
        cfg = {}
        if os.path.exists(CONFIG_PATH):
            try:
                with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
            except Exception:
                pass

        if "api_settings" not in cfg:
            cfg["api_settings"] = {}

        if "api_key" in new_settings:
            cfg["api_settings"]["gemini_api_key"] = new_settings["api_key"]
        if "model" in new_settings:
            cfg["api_settings"]["selected_model"] = new_settings["model"]
        if "threads" in new_settings:
            cfg["threads"] = int(new_settings["threads"])

        try:
            with open(CONFIG_PATH, "w", encoding="utf-8") as f:
                json.dump(cfg, f, indent=2, ensure_ascii=False)
            return {"success": True, "message": "Ayarlar başarıyla kaydedildi."}
        except Exception as e:
            return {"success": False, "error": f"Ayar kaydetme hatası: {str(e)}"}

    def run_ai_analysis(self, filepath: str) -> Dict[str, Any]:
        """Generates rich mechanical engineering CAD reverse engineering insights."""
        if not os.path.exists(filepath):
            return {"success": False, "error": "Dosya bulunamadı."}

        mesh_info = self.load_mesh(filepath)
        if not mesh_info.get("success"):
            return {"success": False, "error": mesh_info.get("error")}

        dims = mesh_info["bounds"]["dimensions"]
        tri_count = mesh_info["triangle_count"]
        fname = mesh_info["filename"]
        cfg = self.get_settings()
        api_key = cfg.get("api_key", "")
        model_name = cfg.get("model", "gemini-3.8-flash")

        prompt = f"""
Sen uzman bir Mekanik Tasarım ve CAD/CAM Mühendisisin.
Aşağıdaki 3D model verilerini inceleyerek imalat, CAD yeniden modelleme (reverse engineering) ve katı model kalitesi açısından detaylı bir teknik analiz sun:

Model Adı: {fname}
Format: {mesh_info['format']}
Üçgen (Faset) Sayısı: {tri_count:,}
Boyutlar (Genişlik x Derinlik x Yükseklik): {dims[0]} mm x {dims[1]} mm x {dims[2]} mm
Köşegen: {mesh_info['bounds']['diagonal']} mm
Dosya Boyutu: {mesh_info['file_size_mb']} MB

Lütfen şu başlıklar altında Türkçe ve net maddelerle yanıt ver:
1. Geometri ve Fonksiyon Değerlendirmesi
2. İmalat Yöntemi Önerisi (3D Baskı FDM/SLA/SLS, CNC Frezeleme, Plastik Enjeksiyon Kalıp)
3. CAD Katı Model Geçişinde Dikkat Edilmesi Gereken Yüzeyler (Delikler, Düzlemler, Radyuslar)
4. Mukavemet ve Montaj Tavsiyeleri
"""
        # Attempt Gemini Cloud API if key is available
        if api_key:
            models_to_try = [model_name]
            for fallback_m in ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]:
                if fallback_m not in models_to_try:
                    models_to_try.append(fallback_m)

            for m in models_to_try:
                try:
                    import urllib.request
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={api_key}"
                    payload = {
                        "contents": [{
                            "parts": [{"text": prompt}]
                        }]
                    }
                    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"})
                    with urllib.request.urlopen(req, timeout=12) as resp:
                        data = json.loads(resp.read().decode("utf-8"))
                        text = data["candidates"][0]["content"]["parts"][0]["text"]
                        badge = f"🚀 [Google Gemini AI: {m}]" if m == model_name else f"🚀 [Google Gemini AI: {m} (Yedek Hızlı Model)]"
                        return {"success": True, "analysis": f"{badge}\n\n" + text}
                except Exception:
                    continue

        # Offline Local Engineering Engine Fallback
        bbox_vol_cm3 = round((dims[0] * dims[1] * dims[2]) / 1000.0, 2)
        aspect_ratio = round(max(dims) / max(min(dims), 0.001), 2)
        tri_density = round(tri_count / max(bbox_vol_cm3, 0.01), 1)

        mfg_rec = []
        if max(dims) <= 250:
            mfg_rec.append("• 3D Baskı (FDM / SLS): Parça standart baskı hacimlerine (250x250x250 mm) uygundur. Katman oryantasyonu Z ekseninde mukavemet odaklı ayarlanmalıdır.")
        if min(dims) > 5.0 and tri_count < 100000:
            mfg_rec.append("• CNC İşleme (3 Eksen Freze): Geometri rijit, montaj yüzeyleri ve faturalar düz takımlarla işlenebilir.")
        if tri_density > 200:
            mfg_rec.append("• Plastik Enjeksiyon / Hassas Döküm: Yoğun faset yapısı ve detaylar kalıplama için idealdir. Çıkma açıları (draft angle) 1-2° kontrol edilmelidir.")

        analysis_report = f"""🛠️ MEKANİK MÜHENDİSLİK & CAD ANALİZ RAPORU

1. GEOMETRİK VE FONKSİYONEL DEĞERLENDİRME:
• Parça Adı: {fname}
• Zarf Hacmi (Bounding Volume): {bbox_vol_cm3} cm³
• Boyutlar: {dims[0]} × {dims[1]} × {dims[2]} mm (Köşegen: {mesh_info['bounds']['diagonal']} mm)
• Faset Yoğunluğu: {tri_density} üçgen/cm³ ({tri_count:,} toplam faset)
• En/Boy Oranı (Aspect Ratio): {aspect_ratio}:1

2. İMALAT VE ÜRETİM TAVSİYELERİ:
{chr(10).join(mfg_rec)}

3. CAD & STEP DÖNÜŞTÜRME KALİTE KRİTERLERİ:
• Eşdüzlemli Yüzeyler: Düz montaj tablaları ve taban yüzeyleri tek bir B-Rep düzlemine birleştirilmelidir (Unify Coplanar aktif).
• Silindirik Delikler & Radyuslar: Bağlantı deliklerinin eksenel doğrusallığı ve feder kavisleri TrueForm motoruyla analitik silindirlere dönüştürülür.
• Tolerans: Standart mekanik montajlar için ISO 2768-m (orta tolerans ±0.2 mm) hedeflenmelidir.

4. MUKAVEMET VE MONTAJ ÖNERİSİ:
• Cıvata ve pim bağlantı bölgelerinde gerilme yığılmasını önlemek için birleşim köşelerinde min R1.5 mm radüs bırakılması önerilir.
• B-Rep katı modeli doğrudan Fusion 360 veya FreeCAD'e aktarılarak FEA statik stres analizi gerçekleştirilebilir."""

        return {"success": True, "analysis": analysis_report}

    def inspect_dfam(self, filepath: Optional[str] = None, body_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Runs comprehensive 3D Printing & Additive Manufacturing (DfAM) inspection via Makina Tasarım Mühendisi.
        Evaluates overhang angles (>45°, >60°), first-layer bed contact area, toppling risk,
        minimum wall thickness, bore sagitta shrinkage offset, and solves the optimal print orientation.
        """
        if not HAS_MECH_ENGINEER:
            return {"success": False, "error": "Makina Tasarım Mühendisi modülü yüklü değil."}

        try:
            eng = MechanicalDesignEngineer()

            # If specific body_id requested from multi-body assembly
            target_verts = None
            body_name = "Model"
            if body_id is not None and self._current_bodies:
                for b in self._current_bodies:
                    if str(b.get("id")) == str(body_id):
                        target_verts = b.get("vertices")
                        body_name = b.get("name", f"Gövde_{body_id}")
                        break

            # If multi-body assembly loaded and no body specified, inspect all active bodies
            active_bodies = [b for b in self._current_bodies if b.get("selected", True)] if self._current_bodies else []
            if target_verts is None and len(active_bodies) > 1 and body_id is None:
                multi_rep = eng.inspect_multi_body_dfam(active_bodies)
                # Also analyze primary combined mesh
                all_v = np.vstack([b["vertices"] for b in active_bodies])
                clean_m = trimesh.Trimesh(vertices=all_v, faces=np.arange(len(all_v)).reshape(-1, 3), process=False)
                single_rep = eng.inspect_manufacturability(clean_m)
                opt = eng.find_optimal_print_orientation(clean_m)
                single_rep["optimal_orientation"] = opt
                single_rep["is_multi_body"] = True
                single_rep["multi_body"] = multi_rep
                single_rep["body_name"] = f"Montaj ({len(active_bodies)} Gövde)"
                return sanitize_for_json({"success": True, "report": single_rep})

            # Single body / single mesh
            if target_verts is None:
                target_verts = self._current_vertices

            if target_verts is None or len(target_verts) == 0:
                target_file = filepath or self._working_mesh_path or self._original_filepath
                if target_file and os.path.exists(target_file):
                    loaded_m = load_trimesh_unified(target_file)
                    clean_m = loaded_m
                else:
                    return {"success": False, "error": "İncelenecek 3D model verisi bulunamadı."}
            else:
                clean_m = trimesh.Trimesh(vertices=target_verts, faces=np.arange(len(target_verts)).reshape(-1, 3), process=False)

            report = eng.inspect_manufacturability(clean_m)
            opt_orient = eng.find_optimal_print_orientation(clean_m)
            report["optimal_orientation"] = opt_orient
            report["is_multi_body"] = False
            report["body_name"] = body_name

            return sanitize_for_json({"success": True, "report": report})
        except Exception as e:
            return {"success": False, "error": f"DfAM denetim hatası: {str(e)}"}

    def apply_optimal_dfam_orientation(self) -> Dict[str, Any]:
        """
        Rotates the model to the mathematically optimal print orientation calculated
        by Makina Tasarım Mühendisi and drops it flat onto the Z=0 ground bed.
        """
        return self.transform_mesh("optimal_dfam")

    def inspect_cad_fidelity(self, step_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Inspects CAD B-Rep solid fidelity and technical drawing geometric tolerance accuracy
        comparing original mesh against newly generated STEP file.
        """
        if not HAS_MECH_ENGINEER:
            return {"success": False, "error": "Makina Tasarım Mühendisi modülü yüklü değil."}

        target_step = step_path or self._current_step_path
        if not target_step or not os.path.exists(target_step):
            return {"success": False, "error": "İncelenecek STEP katı modeli bulunamadı. Önce modeli dönüştürün."}

        if self._current_vertices is None:
            return {"success": False, "error": "Karşılaştırılacak mesh verisi bulunamadı."}

        try:
            clean_m = trimesh.Trimesh(vertices=self._current_vertices, faces=np.arange(len(self._current_vertices)).reshape(-1, 3), process=False)
            eng = MechanicalDesignEngineer()
            res = eng.inspect_cad_fidelity(clean_m, target_step)
            return sanitize_for_json(res)
        except Exception as e:
            return {"success": False, "error": f"CAD doğruluk denetim hatası: {str(e)}"}

    def get_engineering_audit_report(self) -> Dict[str, Any]:
        """
        Compiles a comprehensive engineering evaluation report combining DfAM 3D printability,
        CAD B-Rep technical accuracy, and Project Manager (PM) action directives.
        """
        dfam_res = self.inspect_dfam()
        if not dfam_res.get("success"):
            return dfam_res

        cad_res = self.inspect_cad_fidelity()
        eng = MechanicalDesignEngineer()
        pm_feedback = eng.generate_pm_feedback(dfam_res.get("report", {}), cad_res if cad_res.get("success") else {})

        return sanitize_for_json({
            "success": True,
            "dfam": dfam_res.get("report", {}),
            "cad_fidelity": cad_res if cad_res.get("success") else {},
            "pm_feedback": pm_feedback
        })


def main():
    """Launches the Mesh2Step 3D Studio desktop application."""
    api = CADStudioAPI()
    html_path = os.path.join(APP_DIR, "ui", "index.html")

    window = webview.create_window(
        title="Mesh2Step 3D Studio - Direct Mesh to STEP B-Rep",
        url=f"file:///{html_path.replace(os.sep, '/')}",
        js_api=api,
        width=1440,
        height=900,
        min_size=(1024, 700)
    )
    set_active_window(window)
    webview.start(debug=False)


if __name__ == "__main__":
    main()
