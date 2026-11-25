"""Build the Apple short in Blender and render it.

  python3 -I scene.py stills <shot|frame> ... [--res W H --samples N]   check frames
  python3 -I scene.py preview W H SAMPLES [STEP]                        low-res timing preview
  python3 -I scene.py render W H SAMPLES [START END]                    final frames
  python3 -I scene.py save                                               write apple.blend
"""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, "..", "lightning"), os.path.join(HERE, "..", "quicksand")]
import bpy
from mathutils import Vector, Matrix

import sets as S
import storm as ST
import car as C
import anim
import paper
import props as P
import rooms as R
import cast
import shots
from shots import F, ends, show_in, hide_parts, key_xf, page_point, DESK_TOP
from timeline import FPS, SHOTS, SHOT, END, f

SCRATCH = os.environ["QS_SCRATCH"]
O = R.OFFICE

SETS = {"office": "Office", "house": "House", "stage": "Stage", "shop": "Shop", "auction": "Auction", "nevada": "Nevada"}
EXPOSURE = {"office": 0.35, "house": -0.1, "stage": -0.05, "shop": 0.25, "auction": 0.3, "nevada": 0.1}
WORLD = {"office": (0.0, 0.8), "house": (0.0, 1.0), "stage": (0.0, 1.0), "shop": (0.0, 0.05),
         "auction": (0.0, 0.03), "nevada": (1.0, 0.9)}
SUN_E = {"Office": 4.0, "House": 4.5, "Stage": 4.5, "Nevada": 5.0}


def shots_where(pred):
    return {n for n, t0, t1, st in SHOTS if pred(n, st)}


def bone_parent(obj, arm, bone, frame, world_matrix):
    """Parent obj to a pose bone, keeping `world_matrix` at `frame`."""
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    obj.parent = arm; obj.parent_type = "BONE"; obj.parent_bone = bone
    bpy.context.view_layer.update()
    obj.matrix_world = world_matrix


def bone_matrix(arm, bone):
    bpy.context.view_layer.update()
    return arm.matrix_world @ arm.pose.bones[bone].matrix


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    paper.make_all()
    world = R.World()
    cols = {k: S.collection(v) for k, v in SETS.items()}
    office = R.office(cols["office"]); R.house(cols["house"]); R.stage(cols["stage"])
    R.shop(cols["shop"]); auction = R.auction(cols["auction"]); R.nevada(cols["nevada"])
    suns = {
        "Office": R.sun("SunOffice", cols["office"], 10, 30, SUN_E["Office"]),
        "House": R.sun("SunHouse", cols["house"], -60, 48, SUN_E["House"]),
        "Stage": R.sun("SunStage", cols["stage"], -55, 40, SUN_E["Stage"]),
        "Nevada": R.sun("SunNevada", cols["nevada"], 100, 18, SUN_E["Nevada"], (1.0, 0.82, 0.62)),
    }
    props = S.collection("Props")

    # ---------------------------------------------------------------- office props
    tw, tw_keys = P.typewriter(cols["office"])
    tw.location = O + Vector((0.35, 1.25, DESK_TOP)); tw.rotation_euler = (0, 0, math.pi)
    tw_mat, tw_lvl = P.reveal_mat("TypedPage", P.gen("contract.png"), base=(0.855, 0.8, 0.672), mode="lines")
    tw_page = P.card("TypedPageCard", P.PAGE[0], P.PAGE[1], tw_mat, props, origin="bottom")
    tw_page.location = O + Vector((0.35, 1.12, DESK_TOP + 0.15)); tw_page.rotation_euler = (math.radians(75), 0, math.pi)
    held = P.page("ContractHeld", "contract.png", props)
    held.rotation_mode = "XYZ"
    ring_cu = bpy.data.curves.new("Ring", "CURVE"); ring_cu.dimensions = "3D"; ring_cu.bevel_depth = 0.0012
    sp = ring_cu.splines.new("NURBS"); n = 24
    sp.points.add(n - 1)
    for i in range(n):
        a = 2 * math.pi * i / n
        sp.points[i].co = (0.024 * math.cos(a) + 0.0015 * math.sin(3 * a), 0.012 * math.sin(a), 0, 1)
    sp.use_cyclic_u = True; sp.order_u = 3
    ring_cu.materials.append(S.flat("RingRed", (0.75, 0.04, 0.03), 0.4))
    ring = S.new_obj("Ring", ring_cu, props); ring.parent = held
    ring.location = (-0.008, 0.0127, 0.001)
    fan = [P.bill(f"FanBill{i}", props) for i in range(8)]
    pie, slices = P.pie(props)
    sk_mat, sk_lvl = P.reveal_mat("SketchPage", P.gen("sketch.png"), base=(0.86, 0.82, 0.7), mode="wipe")
    sketch_paper = P.card("SketchPaper", 0.24, 0.24, sk_mat, props)
    sketch_paper.location = O + Vector((0.92, 1.42, DESK_TOP + 0.001)); sketch_paper.rotation_euler = (0, 0, math.pi)
    pens = [P.pen(f"Pen{i}", props) for i in range(4)]
    pcbm = P.pcb_material()
    boards = [P.pcb(f"Board{i}", props, pcbm) for i in range(16)]
    credit_page = P.page("CreditPage", "credit.png", props)
    credit_page.location = O + Vector((1.0, 1.0, DESK_TOP + 0.001))
    cr_mat, cr_lvl = P.reveal_mat("CreditSig", P.gen("sig_credit.png"), base=(1, 1, 1), mode="wipe")
    _alpha_overlay(cr_mat)
    cr_sig = P.card("CreditSigCard", P.PAGE[0], P.PAGE[1], cr_mat, props); cr_sig.parent = credit_page
    cr_sig.location = (0, 0, 0.0004)
    debt = P.debt_board(props); debt.location = O + Vector((0, 0.75, 2.12)); debt.scale = (0.85,) * 3
    hooks = []
    for i in range(3):
        hk = P.hook(f"Hook{i}", props, 0.9)
        rp = P.rope(f"HookRope{i}", 3.0, props, 0.007); rp.parent = hk; rp.location = (0, 0, 1.5 + 0.06)
        hooks.append(hk)
    lining_mat = S.flat("Lining", (0.88, 0.86, 0.82), 0.8)
    linings = [P.card(f"Lining{i}", 0.11, 0.15, lining_mat, props, origin="top") for i in range(4)]
    cal, cal_pages = P.flip_calendar(props); cal.location = O + Vector((1.0, 1.0, DESK_TOP))
    contract_desk = P.page("ContractDesk", "contract.png", props)
    contract_desk.location = O + Vector((0.62, 1.4, DESK_TOP + 0.001)); contract_desk.rotation_euler = (0, 0, math.pi)
    bpy.context.view_layer.update()
    s0 = page_point(contract_desk, 0.09, 0.877); s1 = page_point(contract_desk, 0.53, 0.877)
    strike = P.card("Strike", (s1 - s0).length, 0.0028, S.flat("Ink", (0.03, 0.04, 0.2), 0.4), props, origin="left")
    strike.location = s0 + Vector((0, 0, 0.0002)); strike.rotation_euler = (0, 0, math.atan2((s1 - s0).y, (s1 - s0).x))
    falling = [P.bill(f"DeskBill{i}", props) for i in range(8)]
    cheque = P.cheque("Cheque", props)
    withdrawal = P.page("Withdrawal", "withdrawal.png", props)
    withdrawal.location = O + Vector((0.62, 1.4, DESK_TOP + 0.0015)); withdrawal.rotation_euler = (0, 0, math.pi)
    wd_mat, wd_lvl = P.reveal_mat("WithdrawSig", P.gen("sig_withdraw.png"), base=(1, 1, 1), mode="wipe")
    _alpha_overlay(wd_mat)
    wd_sig = P.card("WithdrawSigCard", P.PAGE[0], P.PAGE[1], wd_mat, props); wd_sig.parent = withdrawal
    wd_sig.location = (0, 0, 0.0004)
    folder, folder_front = P.folder("Folder", props)
    folder.location = O + Vector((0.6, 1.33, DESK_TOP + 0.001)); folder.rotation_euler = (0, 0, math.pi)
    contract_drawer = P.page("ContractDrawer", "contract.png", props)

    # ---------------------------------------------------------------- house props
    car = C.build_car("Car", (0.3, 0.2, 0.06), cols["house"])
    car["root"].location = R.HOUSE + Vector((5.1, -0.9, 0)); car["root"].rotation_euler = (0, 0, math.radians(90))
    tags = []
    for i, p in enumerate((R.HOUSE + Vector((-1.1, 1.9, 1.75)), R.HOUSE + Vector((5.0, 1.9, 1.75)),
                           R.HOUSE + Vector((5.1, -3.1, 1.2)))):
        tg = P.tag(f"Tag{i}", props, 0.8 if i < 2 else 0.5); tg.location = p
        if i == 2:
            tg.rotation_euler = (0, 0, 0)
        tags.append(tg)

    # ---------------------------------------------------------------- stage: pallets of cash
    proto = P.cash_pallet("Pallet", cols["stage"]); proto.location = (0, 0, -500)
    block = P.pallet_field("Block", proto, 50, 45, 20, cols["stage"], origin=R.STAGE + Vector((-31, 8.0, 0)))
    slab = P.pallet_field("Slab", proto, 50, 5, 20, cols["stage"], origin=R.STAGE + Vector((-31, 2.6, 0)))

    # ---------------------------------------------------------------- shop, auction, nevada props
    contract_shop = P.page("ContractShop", "contract.png", props)
    shop_bills = [P.bill(f"ShopBill{i}", props) for i in range(5)]
    board, board_faces = P.auction_board(props); board.location = R.AUCTION + Vector((2.2, 5.8, 3.0))
    holder = bpy.data.objects.new("FrameHolder", None); S.link(holder, props)
    holder.location = R.AUCTION + Vector((-0.3, 4.15, 1.36)); holder.rotation_euler = (math.radians(-8), 0, 0)
    fr_root = R.model("fancy_picture_frame_01", props, (0, 0, 0), 0, 1.3); fr_root.parent = holder
    fr_root.rotation_euler = (0, math.radians(90), 0)
    framed = P.page("ContractFramed", "contract.png", props); framed.parent = holder
    framed.rotation_euler = (math.radians(90), 0, 0); framed.location = (0, -0.03, 0); framed.scale = (1.85,) * 3
    gavel, gblock = P.gavel(props); gblock.location = R.AUCTION + Vector((2.42, 4.0, 1.18))
    paddles = [P.paddle(f"Paddle{i}", n, props) for i, n in enumerate((17, 42, 108, 63))]
    news = P.newspaper(props)

    # ---------------------------------------------------------------- the cast
    wayne = shots.Actor(cast.wayne41())
    steve_a = shots.Actor(cast.steve_a())
    steve_b = shots.Actor(cast.steve_b())
    old = shots.Actor(cast.wayne92())
    auc = shots.Actor(cast.auctioneer())
    bidders = [shots.Actor(cast.bidder(i)) for i in range(4)]
    seats = [auction["chairs"][i] for i in (2, 4, 7, 9)]

    rig = shots.Rig() if hasattr(shots, "Rig") else type("Rig", (), {})()
    rig.__dict__.update(dict(
        wayne=wayne, steve_a=steve_a, steve_b=steve_b, old_wayne=old, auctioneer=auc, bidders=bidders,
        contract_held=held, ring=ring, pie=pie, slices=slices, tw_reveal=tw_lvl.outputs[0], tw_keys=tw_keys,
        typewriter=tw, sketch_reveal=sk_lvl.outputs[0], pen=pens[0], sketch_paper=sketch_paper, boards=boards,
        credit_sig_reveal=cr_lvl.outputs[0], pen2=pens[1], credit_page=credit_page, hooks=hooks, linings=linings,
        tags=tags, cal_pages=cal_pages, strike=strike, pen3=pens[2], contract_desk=contract_desk,
        falling_bills=falling, cheque=cheque, withdraw_sig_reveal=wd_lvl.outputs[0], pen4=pens[3],
        withdrawal=withdrawal, slab=slab, contract_drawer=contract_drawer, folder_front=folder_front,
        contract_shop=contract_shop, shop_bills=shop_bills, board_faces=board_faces, bidder_seats=seats,
        newspaper=news))
    shots.perform(rig)

    # ---------------------------------------------------------------- things held in hands
    a, b = ends("sold800")
    sc.frame_set((a + b) // 2)
    hm = bone_matrix(wayne.arm, "mixamorig:RightHand")
    palm = hm @ Vector((0, 0.08, 0))
    cam_dir = Vector((0.1, -1.0, 0.15)).normalized()           # toward the sold800 camera
    up = Vector((0, 0, 1)); side = up.cross(cam_dir).normalized(); up = cam_dir.cross(side).normalized()
    basis = Matrix((side, up, cam_dir)).transposed().to_4x4()
    for i, bl in enumerate(fan):
        ang = math.radians(-28 + i * 8)
        local = Matrix.Rotation(ang, 4, "Z") @ Matrix.Translation((0, 0.05, 0.0006 * i)) @ Matrix.Rotation(math.pi / 2, 4, "Z")
        bone_parent(bl, wayne.arm, "mixamorig:RightHand", (a + b) // 2, Matrix.Translation(palm) @ basis @ local)
    for i, (pd, ch) in enumerate(zip(paddles, bidders)):
        fr = ends("auction")[0]
        sc.frame_set(fr)
        hm = bone_matrix(ch.arm, "mixamorig:RightHand")
        bone_parent(pd, ch.arm, "mixamorig:RightHand", fr, hm @ Matrix.Translation((0, 0.08, 0)) @
                    Matrix.Rotation(math.radians(-90), 4, "X"))
    fr = ends("gavel")[0]
    sc.frame_set(fr)
    hm = bone_matrix(auc.arm, "mixamorig:RightHand")
    bone_parent(gavel, auc.arm, "mixamorig:RightHand", fr, hm @ Matrix.Translation((0, 0.08, 0.0)) @
                Matrix.Rotation(math.radians(90), 4, "Y") @ Matrix.Translation((0, 0.13, 0)))
    fr = ends("pockets")[0]
    for i, (ch, sg) in enumerate(((steve_a, 1), (steve_a, -1), (steve_b, 1), (steve_b, -1))):
        sc.frame_set(fr)
        hm = bone_matrix(ch.arm, "mixamorig:Hips")
        w = ch.arm.matrix_world.translation + Vector((sg * 0.235, -0.06, ch.hip - 0.07))
        m = Matrix.Translation(w) @ Matrix.Rotation(math.radians(35 * sg), 4, "Z") @ Matrix.Rotation(math.radians(90), 4, "X")
        bone_parent(linings[i], ch.arm, "mixamorig:Hips", fr, m)

    # ---------------------------------------------------------------- cameras and visibility
    cams = shots.cameras(rig)
    office_shots = shots_where(lambda n, st: st == "office")
    groups = {}
    for key, coll in cols.items():
        objs = [o for o in coll.all_objects]
        show_in(objs, shots_where(lambda n, st, key=key: st == key))
    for k, s in suns.items():
        show_in([s], shots_where(lambda n, st, k=k: SETS[st] == k))
    show_in([tw, *tw.children_recursive, tw_page], {"typewriter", "atari", "steves", "adult", "intro", "sold800",
                                                    "split45", "split10"})
    show_in([held, ring], {"intro", "contract10"})
    show_in(fan, {"sold800", "trillion", "slab"})
    show_in([pie, *pie.children_recursive], {"split45", "split10"})
    show_in([sketch_paper], {"sketch"})
    show_in([pens[0], *pens[0].children_recursive], {"sketch"})
    show_in([pens[1], *pens[1].children_recursive], {"credit"})
    show_in([pens[2], *pens[2].children_recursive], {"strike"})
    show_in([pens[3], *pens[3].children_recursive], {"signoff"})
    show_in(boards, {"boards", "credit", "hook", "pockets"})
    show_in([credit_page, cr_sig], {"credit"})
    show_in([debt, *debt.children_recursive], {"hook"})
    show_in([o for h in hooks for o in (h, *h.children_recursive)], {"hook"})
    show_in(linings, {"pockets"})
    show_in([cal, *cal.children_recursive], {"calendar", "strike", "cash800", "check", "signoff", "drawer", "signatures"})
    show_in([contract_desk], {"strike", "cash800", "signatures"})
    show_in([strike], {"strike", "cash800"})
    show_in(falling, {"cash800"})
    show_in([cheque], {"check"})
    show_in([withdrawal, wd_sig], {"signoff"})
    show_in([folder, *folder.children_recursive], {"drawer"})
    show_in([contract_drawer], {"drawer"})
    show_in(tags, {"house"})
    show_in([o for t in tags for o in t.children_recursive], {"house"})
    show_in([contract_shop] + shop_bills, {"sold500"})
    show_in([board] + [c for c in board.children_recursive if c not in board_faces], {"auction", "gavel"})
    show_in([holder, *holder.children_recursive], {"auction", "gavel"})
    show_in([gavel, *gavel.children_recursive, gblock], {"auction", "gavel"})
    show_in([o for p in paddles for o in (p, *p.children_recursive)], {"auction", "gavel"})
    show_in([news, *news.children_recursive], {"newspaper", "stare"})
    # board faces are switched by the performance (keep those keys): re-apply after the set pass
    hide_parts(wayne, shots_where(lambda n, st: n in (
        "intro", "contract10", "sold800", "atari", "steves", "adult", "split45", "split10", "typewriter", "sketch",
        "hook", "house", "calendar", "strike", "cash800", "check", "signoff", "trillion", "slab", "drawer",
        "signatures", "sold500")))
    hide_parts(steve_a, {"atari", "steves", "adult", "split45", "split10", "boards", "credit", "hook", "pockets"})
    hide_parts(steve_b, {"atari", "steves", "adult", "split45", "split10", "boards", "hook", "pockets"})
    hide_parts(old, {"armchair", "newspaper", "stare"})
    hide_parts(auc, {"auction", "gavel"})
    for i, ch in enumerate(bidders):
        hide_parts(ch, {"auction", "gavel"} | ({"sold500"} if i == 0 else set()))
    for o in bpy.data.objects:
        ad = o.animation_data
        if ad and ad.action:
            for fc in ST._fcurves(ad.action):
                if fc.data_path == "hide_render":
                    for kp in fc.keyframe_points:
                        kp.interpolation = "CONSTANT"

    # ---------------------------------------------------------------- world, suns, exposure per shot
    for name, t0, t1, st in SHOTS:
        fr = f(t0)
        sky, strength = WORLD[st]
        world.key(fr, sky, strength)
        sc.view_settings.exposure = EXPOSURE[st]; sc.view_settings.keyframe_insert("exposure", frame=fr)
    ST.set_interp(world.w.node_tree, "CONSTANT")
    ST.set_interp(sc, "CONSTANT")
    sc.frame_start, sc.frame_end = 1, f(END)
    sc.render.fps = FPS
    return rig


def _alpha_overlay(m):
    """Make a reveal material transparent where nothing is drawn (signature layers over a page)."""
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    tex = next(n for n in nt.nodes if n.type == "TEX_IMAGE")
    mix = next(n for n in nt.nodes if n.type == "MIX")
    fac_src = mix.inputs[0].links[0].from_socket
    nt.links.new(fac_src, b.inputs["Alpha"])


def render_settings(w, h, samples):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"
    sc.cycles.samples = samples; sc.cycles.use_adaptive_sampling = True; sc.cycles.adaptive_threshold = 0.05
    sc.cycles.use_denoising = True; sc.cycles.denoiser = "OPENIMAGEDENOISE"
    sc.cycles.max_bounces = 6; sc.cycles.diffuse_bounces = 3; sc.cycles.glossy_bounces = 3
    sc.cycles.transmission_bounces = 6; sc.cycles.transparent_max_bounces = 16
    sc.cycles.sample_clamp_indirect = 6.0; sc.cycles.blur_glossy = 1.0
    sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = "PNG"
    sc.render.use_motion_blur = False
    sc.render.use_persistent_data = True      # keep static sets synced between frames


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "stills"
    args = sys.argv[2:]
    build()
    sc = bpy.context.scene
    if mode == "stills":
        w, h, smp = 360, 640, 12
        if "--res" in args:
            i = args.index("--res"); w, h = int(args[i + 1]), int(args[i + 2]); del args[i:i + 3]
        if "--samples" in args:
            i = args.index("--samples"); smp = int(args[i + 1]); del args[i:i + 2]
        render_settings(w, h, smp)
        out = os.path.join(SCRATCH, "stills"); os.makedirs(out, exist_ok=True)
        frames = []
        for a in args or [n for n, *_ in SHOTS]:
            if a.isdigit():
                frames.append((int(a), a))
            else:
                t0, t1, _ = SHOT[a]
                frames.append(((f(t0) + f(t1) - 1) // 2, a))
        for fr, tag in frames:
            sc.frame_set(fr)
            sc.render.filepath = os.path.join(out, f"{fr:04d}_{tag}.png")
            bpy.ops.render.render(write_still=True)
    elif mode in ("preview", "render"):
        w, h, smp = int(args[0]), int(args[1]), int(args[2])
        render_settings(w, h, smp)
        sub = "preview_frames" if mode == "preview" else "frames"
        out = os.path.join(SCRATCH, sub); os.makedirs(out, exist_ok=True)
        if mode == "preview":
            sc.frame_step = int(args[3]) if len(args) > 3 else 2
        elif len(args) > 4:
            sc.frame_start, sc.frame_end = int(args[3]), int(args[4])
        sc.render.use_overwrite = False
        sc.render.use_placeholder = True
        sc.render.filepath = os.path.join(out, "f####")
        bpy.ops.render.render(animation=True)
    elif mode == "save":
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SCRATCH, "apple.blend"))
    print("done")


if __name__ == "__main__":
    main()
