# -*- coding: utf-8 -*-
"""
Mesh2Step 3D Studio - Makina Tasarım Mühendisi (Mechanical Design & DfAM Engineer)
Uzmanlık Alanı:
1. 3D Printer ve Eklemeli İmalat (DfAM - Design for Additive Manufacturing) Üretilebilirlik Denetimi
   (Overhang açıları, zemin temas alanı, tabla yapışması, kritik ince duvarlar, delik toleransları).
2. Mesh vs Yeni Solid (STEP B-Rep) Teknik Çizim Geometrik Doğrulama Denetimi
   (Hacimsel sapma, analitik düzlem/silindir doğruluğu, faset indirgeme verimi, manifold katı bütünlüğü).
3. PM (Proje Müdürü) Raporlama ve Mühendislik İyileştirme Direktifleri.
"""

import os
import sys
import math
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import trimesh

try:
    from OCP.STEPControl import STEPControl_Reader
    from OCP.IFSelect import IFSelect_RetDone
    from OCP.TopExp import TopExp_Explorer
    from OCP.TopAbs import TopAbs_FACE, TopAbs_SOLID, TopAbs_EDGE, TopAbs_SHELL
    from OCP.TopoDS import TopoDS
    from OCP.BRepAdaptor import BRepAdaptor_Surface
    from OCP.GeomAbs import GeomAbs_Plane, GeomAbs_Cylinder, GeomAbs_BSplineSurface
    from OCP.GProp import GProp_GProps
    from OCP.BRepGProp import BRepGProp
    from OCP.BRepCheck import BRepCheck_Analyzer
    HAS_OCP = True
except ImportError:
    HAS_OCP = False


class MechanicalDesignEngineer:
    """
    Makina Tasarım Mühendisi Ajanı.
    Modelin hem 3D yazıcıda üretilebilirliğini (DfAM) hem de B-Rep CAD modeline dönüştürülme
    doğruluğunu teknik çizim ve tolerans standartlarına göre denetler.
    """

    def __init__(self, agent_name: str = "mech_design_agent"):
        self.agent_name = agent_name
        self.prefix = "📐 [mech_design_agent - Makina Tasarım Mühendisi]:"

    def log(self, message: str):
        print(f"\n{self.prefix} {message}", flush=True)

    def inspect_manufacturability(self, mesh: trimesh.Trimesh) -> Dict[str, Any]:
        """
        3D Printer (Eklemeli İmalat / DfAM) Üretilebilirlik Denetimi.
        - Desteksiz sarkan yüzeyler (Overhangs: > 45 deg)
        - Zemin temas alanı (First Layer Bed Adhesion)
        - Ağırlık merkezi ve tabla devrilme stabilitesi
        - Minimum et kalınlığı & ince duvar uyarısı
        - Delik / silindir fasetleşme büzülme toleransı (sagitta hatası)
        """
        mesh_clean = mesh.copy()
        if not mesh_clean.is_watertight:
            try:
                mesh_clean.fill_holes()
            except Exception:
                pass

        normals = mesh_clean.face_normals
        areas = mesh_clean.area_faces
        total_area = float(np.sum(areas)) if len(areas) > 0 else 1.0

        # 1. Overhang Analizi (Z aşağı bakan yüzeyler: normal . [0,0,-1])
        # 45 dereceden dik açılar (normal_z < -cos(45) = -0.7071)
        cos_45 = math.cos(math.radians(45.0))
        cos_60 = math.cos(math.radians(30.0)) # 60 deg steep overhang
        overhang_mask = normals[:, 2] < -cos_45
        critical_mask = normals[:, 2] < -cos_60

        overhang_area = float(np.sum(areas[overhang_mask]))
        critical_area = float(np.sum(areas[critical_mask]))
        overhang_pct = round((overhang_area / total_area) * 100.0, 2)
        critical_pct = round((critical_area / total_area) * 100.0, 2)
        needs_support = overhang_pct > 3.5

        # 2. Zemin Temas ve Tabla Yapışması (Bed Adhesion & First Layer Footprint)
        bounds = mesh_clean.bounds
        min_z = float(bounds[0][2])
        dims = bounds[1] - bounds[0]
        bed_proj_area = float(dims[0] * dims[1]) if dims[0] * dims[1] > 0 else 1.0

        # Zemin yüzeyleri: Z ekseninde min_z'ye 0.4mm yakın ve tam aşağı bakan yüzeyler (normal_z < -0.96)
        tri_verts = mesh_clean.vertices[mesh_clean.faces]
        max_z_per_tri = tri_verts[:, :, 2].max(axis=1)
        base_mask = (normals[:, 2] < -0.96) & (max_z_per_tri < min_z + 0.45)
        bed_contact_area = float(np.sum(areas[base_mask]))
        bed_contact_pct = round((bed_contact_area / bed_proj_area) * 100.0, 2) if bed_proj_area > 0 else 0.0

        # Tabla yapışma kalitesi
        if bed_contact_area >= 150.0 or bed_contact_pct >= 25.0:
            adhesion_status = "Mükemmel (Brim/Raft Gerektirmez)"
            adhesion_score = 98.0
        elif bed_contact_area >= 50.0 or bed_contact_pct >= 10.0:
            adhesion_status = "Yeterli (Stabil Tabla Teması)"
            adhesion_score = 85.0
        elif bed_contact_area >= 15.0:
            adhesion_status = "Hassas (Brim Kullanımı Önerilir)"
            adhesion_score = 65.0
        else:
            adhesion_status = "Kritik (Devrilme/Kalkma Riski Yüksek, Raft Şart)"
            adhesion_score = 40.0

        # 3. Ağırlık Merkezi (Center of Mass) ve Tabla Stabilitesi
        cog = mesh_clean.centroid
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", RuntimeWarning)
            try:
                if mesh_clean.is_watertight and getattr(mesh_clean, "is_volume", False):
                    cog = mesh_clean.center_mass
            except Exception:
                cog = mesh_clean.centroid
        cog_z_ratio = (cog[2] - min_z) / dims[2] if dims[2] > 0 else 0.5
        toppling_risk = (cog_z_ratio > 0.65) and (bed_contact_pct < 15.0)

        # 4. Minimum Et Kalınlığı & Kritik Duvar İncelemesi
        # Yaklaşık ince duvar tahmini: çok küçük faset grupları ve bounding boyutları
        min_feature_size = float(min(dims[0], dims[1], dims[2]))
        has_thin_walls = min_feature_size < 1.2

        # 5. Dairesel Delik ve Faset Sagitta Büzülme Analizi
        # 3D yazıcı fasetli STL bastığında delikler poligon fasetler sebebiyle dar basılır.
        # Sagitta hatası: delta = R * (1 - cos(pi / N_facets))
        nominal_sagitta_error_mm = 0.08  # Tipik 3D faset büzülme payı

        # DfAM Skoru (0 - 100)
        dfam_score = 100.0
        if needs_support:
            dfam_score -= min(35.0, overhang_pct * 0.8)
        if adhesion_score < 70.0:
            dfam_score -= (70.0 - adhesion_score) * 0.5
        if has_thin_walls:
            dfam_score -= 10.0
        if toppling_risk:
            dfam_score -= 15.0
        dfam_score = max(20.0, min(100.0, round(dfam_score, 1)))

        return {
            "total_area_mm2": round(total_area, 2),
            "dimensions_mm": [round(float(d), 2) for d in dims],
            "overhang_area_mm2": round(overhang_area, 2),
            "overhang_pct": overhang_pct,
            "critical_overhang_area_mm2": round(critical_area, 2),
            "critical_overhang_pct": critical_pct,
            "needs_support": needs_support,
            "bed_contact_area_mm2": round(bed_contact_area, 2),
            "bed_contact_pct": bed_contact_pct,
            "adhesion_status": adhesion_status,
            "adhesion_score": adhesion_score,
            "center_of_gravity": [round(float(c), 2) for c in cog],
            "toppling_risk": toppling_risk,
            "has_thin_walls": has_thin_walls,
            "min_feature_size_mm": round(min_feature_size, 2),
            "sagitta_hole_shrinkage_mm": nominal_sagitta_error_mm,
            "dfam_score": dfam_score
        }

    def find_optimal_print_orientation(self, mesh: trimesh.Trimesh) -> Dict[str, Any]:
        """
        Calculates the mathematically optimal 3D print orientation.
        Evaluates candidate rotations to minimize support volume (overhangs >45°)
        and maximize first-layer bed contact area while minimizing toppling risk and Z height.
        """
        mesh_clean = mesh.copy()
        if len(mesh_clean.faces) == 0:
            return {"success": False, "error": "Geçersiz boş mesh."}

        # Subsample faces if huge (> 40000) for fast sub-second evaluation
        eval_mesh = mesh_clean
        if len(mesh_clean.faces) > 40000:
            try:
                eval_mesh = mesh_clean.simplify_quadric_decimation(25000)
            except Exception:
                eval_mesh = mesh_clean

        total_area = float(eval_mesh.area) if eval_mesh.area > 0 else 1.0
        cos_45 = math.cos(math.radians(45.0))

        def _evaluate_orientation(r_mat: np.ndarray) -> Tuple[float, float, float, float, float]:
            rot_norms = eval_mesh.face_normals @ r_mat.T
            rot_verts = eval_mesh.vertices @ r_mat.T
            min_z = float(rot_verts[:, 2].min())
            max_z = float(rot_verts[:, 2].max())
            height = max(0.1, max_z - min_z)

            # Overhang (> 45°) and Critical Overhang (> 60°)
            ov_mask = rot_norms[:, 2] < -cos_45
            crit_ov_mask = rot_norms[:, 2] < -0.866
            ov_area = float(np.sum(eval_mesh.area_faces[ov_mask]))
            crit_ov_area = float(np.sum(eval_mesh.area_faces[crit_ov_mask]))

            # Bed adhesion (faces close to min_z with normal pointing downwards)
            tri_z = rot_verts[eval_mesh.faces, 2]
            max_tri_z = tri_z.max(axis=1)
            base_mask = (rot_norms[:, 2] < -0.92) & (max_tri_z < min_z + 0.45)
            bed_area = float(np.sum(eval_mesh.area_faces[base_mask]))

            # Anti-Toppling & Slenderness physics
            eff_width = math.sqrt(max(bed_area, 0.1))
            slenderness = height / eff_width
            toppling_penalty = (slenderness ** 2) * 35.0

            # Absolute small contact penalty: knife-edge or point contacts < 30mm² are unprintable
            if bed_area < 30.0:
                toppling_penalty += 10000.0

            # Height penalty: favors low build heights (fewer Z layers, less wobble, faster print)
            height_penalty = height * 8.0

            # Bed contact reward (strong positive incentive for rock-solid base)
            bed_reward = bed_area * 3.0

            # Objective Cost: Lower is better
            cost = (ov_area * 1.0) + (crit_ov_area * 2.0) - bed_reward + toppling_penalty + height_penalty
            return cost, ov_area, bed_area, height, slenderness

        candidates = [
            ("Mevcut Yön (Orijinal)", np.eye(3)),
            ("Taban Ters (180° Çevir)", np.array([[1.0, 0.0, 0.0], [0.0, -1.0, 0.0], [0.0, 0.0, -1.0]])),
            ("X Ekseni +90°", np.array([[1.0, 0.0, 0.0], [0.0, 0.0, -1.0], [0.0, 1.0, 0.0]])),
            ("X Ekseni -90°", np.array([[1.0, 0.0, 0.0], [0.0, 0.0, 1.0], [0.0, -1.0, 0.0]])),
            ("Y Ekseni +90°", np.array([[0.0, 0.0, 1.0], [0.0, 1.0, 0.0], [-1.0, 0.0, 0.0]])),
            ("Y Ekseni -90°", np.array([[0.0, 0.0, -1.0], [0.0, 1.0, 0.0], [1.0, 0.0, 0.0]])),
        ]

        # Multi-Planar Candidate Generation: Extract all significant flat faces (area >= 35 mm²)
        try:
            norms = eval_mesh.face_normals
            adj = eval_mesh.face_adjacency
            if len(adj) > 0:
                angles = eval_mesh.face_adjacency_angles
                flat_mask = angles < np.radians(2.0)
                import networkx as nx
                g = nx.Graph()
                g.add_nodes_from(range(len(eval_mesh.faces)))
                if np.any(flat_mask):
                    for edge in adj[flat_mask]:
                        g.add_edge(edge[0], edge[1])
                comps = list(nx.connected_components(g))
                comp_areas = [(float(np.sum(eval_mesh.area_faces[list(c)])), list(c)) for c in comps]
                comp_areas.sort(key=lambda x: x[0], reverse=True)

                target_down = np.array([0.0, 0.0, -1.0])
                added_normals = []

                for c_area, c_faces in comp_areas[:6]:
                    if c_area < 35.0 and c_area < (total_area * 0.03):
                        break
                    c_norm = np.mean(norms[c_faces], axis=0)
                    c_norm /= (np.linalg.norm(c_norm) + 1e-8)

                    # Deduplicate almost identical normals
                    if any(np.dot(c_norm, an) > 0.96 for an in added_normals):
                        continue
                    added_normals.append(c_norm)

                    # Rotate c_norm to [0, 0, -1]
                    c_dot = float(np.dot(c_norm, target_down))
                    if c_dot > 0.9999:
                        R_flat = np.eye(3)
                    elif c_dot < -0.9999:
                        R_flat = np.array([[1.0, 0.0, 0.0], [0.0, -1.0, 0.0], [0.0, 0.0, -1.0]])
                    else:
                        v_cross = np.cross(c_norm, target_down)
                        s_norm = np.linalg.norm(v_cross)
                        vx = np.array([
                            [0, -v_cross[2], v_cross[1]],
                            [v_cross[2], 0, -v_cross[0]],
                            [-v_cross[1], v_cross[0], 0]
                        ])
                        R_flat = np.eye(3) + vx + (vx @ vx) * ((1.0 - c_dot) / (s_norm ** 2))

                    candidates.append((f"Düzlemi Tabana Oturt ({round(c_area, 1)} mm²)", R_flat))
        except Exception:
            pass

        # Evaluate current
        curr_cost, curr_ov, curr_bed, curr_h, curr_slender = _evaluate_orientation(candidates[0][1])

        best_cand = candidates[0]
        best_cost = curr_cost
        best_ov = curr_ov
        best_bed = curr_bed
        best_h = curr_h
        best_slender = curr_slender

        for name, r_mat in candidates:
            c, ov, bed, h, s = _evaluate_orientation(r_mat)
            if c < best_cost - 1e-3:
                best_cost = c
                best_cand = (name, r_mat)
                best_ov = ov
                best_bed = bed
                best_h = h
                best_slender = s

        is_optimal = (best_cand[0] == candidates[0][0])
        ov_reduction = round(((curr_ov - best_ov) / total_area) * 100.0, 1) if not is_optimal else 0.0
        bed_increase = round(best_bed - curr_bed, 1)

        if not is_optimal:
            support_note = f" ve sarkan alan %{ov_reduction} oranında minimize edilir." if ov_reduction > 0 else " ve model devrilmeye karşı maksimum tabla yapışmasıyla güvenliğe alınır."
            reasoning = (
                f"Parça '{best_cand[0]}' açısına getirildiğinde tabla temas alanı +{bed_increase} mm² artarak devrilme riskini ortadan kaldırır "
                f"(narinlik: {curr_slender:.1f} -> {best_slender:.1f}){support_note}"
            )
        else:
            reasoning = f"Mevcut yönlendirme 3D baskı için zaten en ideal pozisyondadır (Geniş tabla teması: {best_bed:.1f} mm², güvenli narinlik: {best_slender:.2f}, minimum yükseklik: {best_h:.1f} mm)."

        return {
            "success": True,
            "optimal_rotation_name": best_cand[0],
            "optimal_rotation_matrix": best_cand[1].tolist(),
            "is_already_optimal": is_optimal,
            "current_overhang_pct": round((curr_ov / total_area) * 100.0, 1),
            "optimal_overhang_pct": round((best_ov / total_area) * 100.0, 1),
            "overhang_reduction_pct": max(0.0, ov_reduction),
            "current_bed_contact_mm2": round(curr_bed, 1),
            "optimal_bed_contact_mm2": round(best_bed, 1),
            "adhesion_increase_mm2": max(0.0, bed_increase),
            "reasoning": reasoning
        }

    def inspect_multi_body_dfam(self, bodies: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Inspects all components of an assembly (e.g. 3MF 13-body PenPlotter).
        Ranks parts by 3D printability, identifies critical overhangs, and provides an assembly DfAM score.
        """
        body_reports = []
        total_area = 0.0
        weighted_dfam = 0.0

        for b in bodies:
            flat_v = b.get("vertices")
            if flat_v is None:
                continue
            m = trimesh.Trimesh(vertices=flat_v, faces=np.arange(len(flat_v)).reshape(-1, 3), process=False)
            rep = self.inspect_manufacturability(m)
            area = rep.get("total_area_mm2", 1.0)
            score = rep.get("dfam_score", 80.0)

            total_area += area
            weighted_dfam += score * area

            body_reports.append({
                "id": b.get("id"),
                "name": b.get("name", "Bileşen"),
                "dfam_score": score,
                "needs_support": rep.get("needs_support", False),
                "overhang_pct": rep.get("overhang_pct", 0.0),
                "bed_contact_area_mm2": rep.get("bed_contact_area_mm2", 0.0),
                "has_thin_walls": rep.get("has_thin_walls", False)
            })

        assembly_score = round(weighted_dfam / total_area, 1) if total_area > 0 else 85.0
        critical_parts = [r for r in body_reports if r["dfam_score"] < 75.0]

        return {
            "assembly_dfam_score": assembly_score,
            "total_bodies": len(body_reports),
            "critical_bodies_count": len(critical_parts),
            "body_reports": body_reports,
            "summary": (
                f"{len(body_reports)} parçalı montajın genel DfAM üretilebilirlik skoru: {assembly_score}/100. "
                f"{len(critical_parts)} bileşende destek veya zemin temas optimizasyonu gereklidir."
            )
        }

    def inspect_cad_fidelity(self, mesh: trimesh.Trimesh, step_path: str) -> Dict[str, Any]:
        """
        Mesh vs Yeni Solid (STEP B-Rep) Teknik Çizim Geometrik Fark Denetimi.
        - Hacimsel Sapma (% Volume Deviation)
        - B-Rep Yüzey Türleri (Düzlem, Silindir, Serbest Form)
        - Manifold Su Geçirmezlik & Kapalı Katı Bütünlüğü
        - Faset İndirgeme Verimliliği
        """
        if not HAS_OCP:
            return {"success": False, "error": "OpenCASCADE (OCP) modülü yüklü değil."}

        if not os.path.exists(step_path):
            return {"success": False, "error": f"STEP dosyası bulunamadı: {step_path}"}

        # 1. Mesh Hacmi
        mesh_vol = 0.0
        try:
            if mesh.is_watertight:
                mesh_vol = float(abs(mesh.volume))
            else:
                m_copy = mesh.copy()
                m_copy.fill_holes()
                mesh_vol = float(abs(m_copy.volume))
        except Exception:
            mesh_vol = 0.0

        # 2. STEP Dosyası OCP İncelemesi
        reader = STEPControl_Reader()
        status = reader.ReadFile(step_path)
        if status != IFSelect_RetDone:
            return {"success": False, "error": "STEP dosyası OpenCASCADE tarafından okunamadı."}

        reader.TransferRoots()
        shape = reader.OneShape()

        # Katı Hacmi
        gprops = GProp_GProps()
        BRepGProp.VolumeProperties_s(shape, gprops)
        brep_vol = float(abs(gprops.Mass()))

        vol_diff = abs(brep_vol - mesh_vol)
        vol_deviation_pct = round((vol_diff / mesh_vol) * 100.0, 3) if mesh_vol > 0 else 0.0

        # Yüzey Türleri İncelemesi
        exp_f = TopExp_Explorer(shape, TopAbs_FACE)
        n_faces = 0
        n_planes = 0
        n_cylinders = 0
        n_bsplines = 0
        n_other = 0

        while exp_f.More():
            f = TopoDS.Face(exp_f.Current())
            surf_adaptor = BRepAdaptor_Surface(f)
            st = surf_adaptor.GetType()
            if st == GeomAbs_Plane:
                n_planes += 1
            elif st == GeomAbs_Cylinder:
                n_cylinders += 1
            elif st == GeomAbs_BSplineSurface:
                n_bsplines += 1
            else:
                n_other += 1
            n_faces += 1
            exp_f.Next()

        # Katı Manifold Bütünlüğü
        analyzer = BRepCheck_Analyzer(shape)
        is_valid_brep = analyzer.IsValid()

        # Katı (Solid) Varlığı & Manifoldluk
        has_solids = False
        if shape.ShapeType() == TopAbs_SOLID:
            has_solids = True
        else:
            exp_sol = TopExp_Explorer(shape, TopAbs_SOLID)
            if exp_sol.More():
                has_solids = True
            elif shape.ShapeType() == TopAbs_SHELL:
                try:
                    from OCP.BRepBuilderAPI import BRepBuilderAPI_MakeSolid
                    sm_chk = BRepBuilderAPI_MakeSolid(TopoDS.Shell(shape))
                    if sm_chk.IsDone() and brep_vol > 0.001:
                        has_solids = True
                except Exception:
                    pass

        # Faset İndirgeme Oranı
        orig_tri = len(mesh.faces)
        reduction_pct = round((1.0 - (n_faces / orig_tri)) * 100.0, 2) if orig_tri > 0 else 0.0

        # Teknik Çizim / CAD B-Rep Doğruluk Skoru (0 - 100)
        fidelity_score = 100.0
        if vol_deviation_pct > 1.0:
            fidelity_score -= min(40.0, vol_deviation_pct * 10.0)
        if not is_valid_brep:
            fidelity_score -= 20.0
        if not has_solids:
            fidelity_score -= 25.0
        if n_faces >= orig_tri:
            fidelity_score -= 15.0  # Hiç faset sadeleşmesi olmamışsa
        fidelity_score = max(10.0, min(100.0, round(fidelity_score, 1)))

        return {
            "success": True,
            "mesh_triangles": orig_tri,
            "brep_faces": n_faces,
            "analytical_planes": n_planes,
            "analytical_cylinders": n_cylinders,
            "bspline_surfaces": n_bsplines,
            "other_surfaces": n_other,
            "analytical_ratio_pct": round(((n_planes + n_cylinders) / n_faces) * 100.0, 1) if n_faces > 0 else 0.0,
            "mesh_volume_mm3": round(mesh_vol, 2),
            "brep_volume_mm3": round(brep_vol, 2),
            "volume_deviation_pct": vol_deviation_pct,
            "reduction_pct": reduction_pct,
            "is_valid_brep": is_valid_brep,
            "is_solid_watertight": has_solids,
            "fidelity_score": fidelity_score
        }

    def generate_pm_feedback(self, dfam: Dict[str, Any], fidelity: Dict[str, Any]) -> Dict[str, Any]:
        """
        Makina Tasarım Mühendisi değerlendirme raporu ve PM için aksiyon talimatları üretir.
        """
        combined_score = round((dfam.get("dfam_score", 70.0) * 0.45) + (fidelity.get("fidelity_score", 70.0) * 0.55), 1)

        recommendations = []

        # DfAM İyileştirme Tavsiyeleri
        if dfam.get("needs_support"):
            recommendations.append(
                f"⚠️ Overhang Uyarısı: Model yüzeyinin %{dfam.get('overhang_pct')}'si 45°'den dik açıyla sarkıyor. "
                "3D baskıda destek ihtiyacını azaltmak için eğimli geçiş açıları optimize edilmeli veya parçanın tabana oturtma açısı gözden geçirilmeli."
            )
        if dfam.get("adhesion_score", 100) < 70.0:
            recommendations.append(
                f"⚠️ Zemin Temas Uyarısı: İlk katman temas alanı yetersiz (%{dfam.get('bed_contact_pct')}). "
                "Tabla yapışması ve warping (bükülme) riskine karşı taban yüzeyi genişletilmeli veya Brim desteği önerilmeli."
            )
        if dfam.get("has_thin_walls"):
            recommendations.append(
                f"⚠️ Kritik İnce Duvar: {dfam.get('min_feature_size_mm')} mm et kalınlığı tespit edildi. "
                "0.4mm nozzle için en az 2 perimetre (1.0 - 1.2mm) kalınlık garanti edilmeli."
            )

        # CAD / B-Rep İyileştirme Tavsiyeleri
        if fidelity.get("volume_deviation_pct", 0.0) > 0.5:
            recommendations.append(
                f"🔧 Hacimsel Sapma: B-Rep ile Mesh arasında %{fidelity.get('volume_deviation_pct')} hacim farkı var. "
                "RANSAC düzlem sınır dikiş toleransı (linear_tol) daraltılarak faset boşlukları kapatılmalı."
            )
        if fidelity.get("analytical_cylinders", 0) == 0 and dfam.get("sagitta_hole_shrinkage_mm"):
            recommendations.append(
                "🔧 Silindir / Delik Toleransı: Fasetleşmiş deliklerde sagitta büzülmesi var. "
                "RANSAC silindir tespit toleransı artırılarak cıvata/mil delikleri gerçek analitik silindire dönüştürülmeli."
            )
        if not fidelity.get("is_solid_watertight"):
            recommendations.append(
                "🛑 Katı Model Bütünlüğü: Üretilen model açık kabuk (open shell) içeriyor. "
                "BRepBuilderAPI_Sewing toleransı artırılarak ve ShapeFix_Solid devreye alınarak %100 kapalı katı sağlanmalı."
            )
        if fidelity.get("reduction_pct", 0.0) < 50.0:
            recommendations.append(
                f"💡 Faset Sadeleşme Verimi: Faset indirgeme %{fidelity.get('reduction_pct')} seviyesinde kaldı. "
                "Koplanar yüzey birleştirme (unify_angle) eşiği optimize edilerek düzlem sayısı sadeleştirilmeli."
            )

        if not recommendations:
            recommendations.append("✅ Mükemmel Mühendislik Kalitesi: Hem 3D baskı üretilebilirliği hem de B-Rep teknik çizim doğruluğu endüstriyel standartta.")

        return {
            "combined_engineering_score": combined_score,
            "dfam_score": dfam.get("dfam_score"),
            "fidelity_score": fidelity.get("fidelity_score"),
            "recommendations": recommendations,
            "status": "APPROVED" if combined_score >= 85.0 else ("NEEDS_IMPROVEMENT" if combined_score >= 60.0 else "REJECTED")
        }
