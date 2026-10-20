#!/usr/bin/env python3
"""Generate the cast as rigged GLBs with MakeHuman/MPFB 2 (CC0 assets) inside Blender (bpy module).

Run with the Blender python (pip install bpy, MPFB 2 extension installed, makehuman_system_assets_cc0 unpacked into
MPFB's user data dir):   /tmp/bvenv/bin/python tip-bait/tools/gen_humans.py tip-bait/assets/cast
Each character gets the Mixamo-compatible rig so the Mixamo clip library drives it in three.js.
"""
import os
import sys
import bpy

OUT = os.path.abspath(sys.argv[-1])
os.makedirs(OUT, exist_ok=True)
DATA = os.path.expanduser('~/.config/blender/5.2/extensions/.user/user_default/mpfb/data')

import addon_utils  # noqa: E402
addon_utils.enable('bl_ext.user_default.mpfb', default_set=True)
from bl_ext.user_default.mpfb.services.humanservice import HumanService  # noqa: E402
from bl_ext.user_default.mpfb.services.objectservice import ObjectService  # noqa: E402

CAST = {
    # name: macros, skin, hair, eyebrows, clothes
    'courier': dict(m=dict(gender=1.0, age=0.45, muscle=0.6, weight=0.45, height=0.55, proportions=0.6, race=dict(african=0.55, caucasian=0.25, asian=0.2)),
                    skin='young_african_male', hair='short04', brows='eyebrow001', clothes=['male_casualsuit05', 'shoes06']),
    'kyle': dict(m=dict(gender=1.0, age=0.42, muscle=0.35, weight=0.68, height=0.5, proportions=0.45, race=dict(caucasian=0.9, african=0.05, asian=0.05)),
                 skin='young_caucasian_male', hair='short02', brows='eyebrow006', clothes=['male_casualsuit06', 'shoes04']),
    'tourist_m': dict(m=dict(gender=1.0, age=0.6, muscle=0.4, weight=0.75, height=0.45, proportions=0.4, race=dict(caucasian=0.8, african=0.1, asian=0.1)),
                      skin='middleage_caucasian_male', hair='short01', brows='eyebrow003', clothes=['male_casualsuit04', 'shoes05']),
    'tourist_f': dict(m=dict(gender=0.0, age=0.5, muscle=0.4, weight=0.6, height=0.45, proportions=0.5, race=dict(caucasian=0.5, asian=0.3, african=0.2)),
                      skin='young_caucasian_female', hair='ponytail01', brows='eyebrow010', clothes=['female_casualsuit02', 'shoes05']),
    'local_f': dict(m=dict(gender=0.0, age=0.4, muscle=0.5, weight=0.45, height=0.55, proportions=0.6, race=dict(african=0.7, caucasian=0.2, asian=0.1)),
                    skin='young_african_female', hair='afro01', brows='eyebrow011', clothes=['female_casualsuit01', 'shoes06']),
    'local_m': dict(m=dict(gender=1.0, age=0.5, muscle=0.5, weight=0.5, height=0.5, proportions=0.5, race=dict(asian=0.6, caucasian=0.3, african=0.1)),
                    skin='young_asian_male', hair='short03', brows='eyebrow002', clothes=['male_casualsuit01', 'shoes02']),
    'barista': dict(m=dict(gender=0.0, age=0.38, muscle=0.45, weight=0.45, height=0.5, proportions=0.6, race=dict(caucasian=0.4, african=0.3, asian=0.3)),
                    skin='young_caucasian_female2', hair='bob01', brows='eyebrow012', clothes=['female_casualsuit01', 'shoes04']),
}


def find(kind, name, ext):
    p = os.path.join(DATA, kind, name, f'{name}.{ext}')
    if os.path.exists(p):
        return p
    for root, _, files in os.walk(os.path.join(DATA, kind)):
        for f in files:
            if f == f'{name}.{ext}':
                return os.path.join(root, f)
    raise FileNotFoundError(f'{kind}/{name}.{ext}')


def simplify_material(mt):
    # glTF-friendly: Principled BSDF with the diffuse (base colour, alpha) + normal map found in the original tree
    if mt is None or not mt.use_nodes:
        return
    imgs = [n.image for n in mt.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image]
    def pick(*keys):
        for k in keys:
            for im in imgs:
                if k in im.name.lower() or k in (im.filepath or '').lower():
                    return im
        return None
    diff = pick('diffuse', 'color', 'albedo') or (imgs[0] if imgs else None)
    nor = pick('normal')
    nt = mt.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bsdf.outputs[0], out.inputs[0])
    bsdf.inputs['Roughness'].default_value = 0.55 if 'skin' in mt.name.lower() or 'young' in mt.name.lower() or 'male' in mt.name.lower() else 0.8
    if diff:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = diff
        nt.links.new(t.outputs['Color'], bsdf.inputs['Base Color'])
        if any(k in mt.name.lower() for k in ('hair', 'brow', 'lash')):
            nt.links.new(t.outputs['Alpha'], bsdf.inputs['Alpha'])
            mt.blend_method = 'BLEND' if hasattr(mt, 'blend_method') else None
    if nor and nor != diff:
        t2 = nt.nodes.new('ShaderNodeTexImage'); t2.image = nor; t2.image.colorspace_settings.name = 'Non-Color'
        nm = nt.nodes.new('ShaderNodeNormalMap')
        nt.links.new(t2.outputs['Color'], nm.inputs['Color'])
        nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])


def build(name, spec):
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.armatures, bpy.data.images):
        for x in list(coll):
            if x.users == 0:
                coll.remove(x)
    md = {'gender': 0.5, 'age': 0.5, 'muscle': 0.5, 'weight': 0.5, 'proportions': 0.5, 'height': 0.5, 'cupsize': 0.5, 'firmness': 0.5,
          'race': {'asian': 0.33, 'caucasian': 0.33, 'african': 0.33}}
    for k, v in spec['m'].items():
        md[k] = v
    basemesh = HumanService.create_human(macro_detail_dict=md, scale=0.1)
    HumanService.add_builtin_rig(basemesh, 'mixamo', import_weights=True)  # rig first so every asset gets weights
    HumanService.set_character_skin(find('skins', spec['skin'], 'mhmat'), basemesh, skin_type='GAMEENGINE')
    HumanService.add_mhclo_asset(find('eyes', 'low-poly', 'mhclo'), basemesh, asset_type='Eyes', subdiv_levels=0, material_type='MAKESKIN')
    HumanService.add_mhclo_asset(find('eyebrows', spec['brows'], 'mhclo'), basemesh, asset_type='Eyebrows', subdiv_levels=0, material_type='MAKESKIN')
    HumanService.add_mhclo_asset(find('eyelashes', 'eyelashes01', 'mhclo'), basemesh, asset_type='Eyelashes', subdiv_levels=0, material_type='MAKESKIN')
    HumanService.add_mhclo_asset(find('hair', spec['hair'], 'mhclo'), basemesh, asset_type='Hair', subdiv_levels=0, material_type='MAKESKIN')
    for c in spec['clothes']:
        HumanService.add_mhclo_asset(find('clothes', c, 'mhclo'), basemesh, asset_type='Clothes', subdiv_levels=0, material_type='MAKESKIN')
    for o in list(bpy.data.objects):
        if o.type == 'MESH':
            for m in list(o.modifiers):
                if m.type not in ('ARMATURE', 'MASK'):
                    o.modifiers.remove(m)
            arm = [m for m in o.modifiers if m.type == 'ARMATURE']
            print('MESH', o.name, 'parent', o.parent.name if o.parent else None, 'armature', bool(arm), 'groups', len(o.vertex_groups))
            for mt in o.data.materials:
                simplify_material(mt)
    out = os.path.join(OUT, f'{name}.glb')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True, export_animations=False, export_skins=True,
                              export_morph=False, export_image_format='JPEG', export_jpeg_quality=88)
    print('WROTE', out, os.path.getsize(out))


only = [a for a in sys.argv[1:-1] if a in CAST] if len(sys.argv) > 2 else []
for name, spec in CAST.items():
    if only and name not in only:
        continue
    try:
        build(name, spec)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print('FAILED', name, e)
