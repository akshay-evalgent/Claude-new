"""Visual plan v2: real archive footage and photographs cut together with the motion graphics.

VIS maps a shot index in shots.S to a list of visuals that split that line's time by weight `w`.
A visual is either footage ("photo" / "clip") or one of the graphic scenes in render.py / render2.py.
Narration and timing are unchanged from shots.py, so timing.json is reused.

Footage keys are defined in SOURCES (file, licence, credit). Only public domain, CC0, CC BY and
CERN-terms material is used; share-alike files were left out so the video carries no SA obligation.
"""

# ------------------------------------------------------------------ sources
# kind: still | clip ; file is relative to the footage directory passed to the build
SOURCES = {
    # --- Superconducting Super Collider (U.S. Department of Energy, public domain)
    "doe_concept":  dict(kind="still", file="raw/doe_concept.jpg",  credit="U.S. Department of Energy", lic="Public domain"),
    "doe_location": dict(kind="still", file="raw/doe_location.jpg", credit="U.S. Department of Energy", lic="Public domain"),
    "doe_magnet":   dict(kind="still", file="raw/doe_magnet.jpg",   credit="U.S. Department of Energy", lic="Public domain"),
    "doe_linac":    dict(kind="still", file="raw/doe_linac.jpg",    credit="U.S. Department of Energy / SSC Central Design Group", lic="Public domain"),
    "doe_sector":   dict(kind="still", file="raw/doe_sector.jpg",   credit="U.S. Department of Energy / SSC Central Design Group", lic="Public domain"),
    "doe_aerial":   dict(kind="still", file="raw/doe_aerial.jpg",   credit="U.S. Department of Energy / SSC Central Design Group", lic="Public domain"),
    "doe_schematic": dict(kind="still", file="raw/doe_schematic.jpg", credit="U.S. Department of Energy", lic="Public domain"),
    "ssc_mdl":      dict(kind="still", file="raw/ssc_mdl.jpg",      credit="Wikimedia Commons (SSC site, Waxahachie)", lic="Public domain"),
    # --- context stills
    "fermilab_aerial": dict(kind="still", file="raw/fermilab_aerial.jpg", credit="Fermilab / U.S. DOE", lic="Public domain"),
    "fermilab_tunnel": dict(kind="still", file="raw/fermilab_tunnel.jpg", credit="U.S. Department of Energy", lic="Public domain"),
    "fermilab_helium": dict(kind="still", file="raw/fermilab_helium.jpg", credit="U.S. Department of Energy", lic="Public domain"),
    "higgs_fermilab":  dict(kind="still", file="raw/higgs_fermilab.jpg",  credit="Fermilab / U.S. DOE", lic="Public domain"),
    "bubble1":   dict(kind="still", file="raw/bubble1.jpg", credit="U.S. Department of Energy", lic="Public domain"),
    "bubble2":   dict(kind="still", file="raw/bubble2.jpg", credit="Lawrence Berkeley Laboratory / U.S. DOE", lic="Public domain"),
    "freedom":   dict(kind="still", file="raw/freedom.jpg", credit="NASA / Alan Chinchar", lic="Public domain"),
    "freedom_model": dict(kind="still", file="raw/freedom_model.jpg", credit="NASA", lic="Public domain"),
    "reagan_gorb": dict(kind="still", file="raw/reagan_gorb.jpg", credit="White House Photographic Office", lic="Public domain"),
    "berlin_gate": dict(kind="still", file="raw/berlin_gate.jpg", credit="Wikimedia Commons (Brandenburg Gate, 9 Nov 1989)", lic="CC BY 3.0"),
    "capitol_dusk": dict(kind="still", file="raw/capitol_dusk.jpg", credit="Architect of the Capitol", lic="Public domain"),
    "wax_street": dict(kind="still", file="raw/wax_street.jpg", credit="Carol M. Highsmith / Library of Congress", lic="Public domain"),
    "atlas":     dict(kind="still", file="raw/atlas.jpg", credit="CERN", lic="CC BY 4.0"),
    # --- congressional documents (U.S. Government, public domain)
    "doc_1988": dict(kind="still", file="docs/micro_IA41152637_0342-001.jpg", credit="U.S. House of Representatives, 1988", lic="Public domain"),
    "doc_1989": dict(kind="still", file="docs/micro_IA41152647_0019-01.jpg",  credit="U.S. General Accounting Office, 1989", lic="Public domain"),
    "doc_1991": dict(kind="still", file="docs/micro_IA41152852_0832-001.jpg", credit="U.S. House of Representatives, 1991", lic="Public domain"),
    "doc_1992": dict(kind="still", file="docs/micro_IA41152623_1107-01.jpg",  credit="U.S. Senate, 1992", lic="Public domain"),
    # --- moving footage
    "cern_tunnel":    dict(kind="clip", file="raw/cern_2782251.mp4", credit="CERN", lic="CERN terms (educational/informational use)"),
    "cern_dipole":    dict(kind="clip", file="raw/cern_1709735.mp4", credit="CERN", lic="CERN terms (educational/informational use)"),
    "cern_collision": dict(kind="clip", file="raw/cern_3027526.mp4", credit="CERN", lic="CERN terms (educational/informational use)"),
    "cern_cms":       dict(kind="clip", file="raw/cern_1750703.mp4", credit="CERN", lic="CERN terms (educational/informational use)"),
    "cern_aerial":    dict(kind="clip", file="raw/cern_2065158.mp4", credit="CERN", lic="CERN terms (educational/informational use)"),
    "cern_cryo":      dict(kind="clip", file="raw/cern_2297127.mp4", credit="CERN", lic="CERN terms (educational/informational use)"),
    "cern_hd2012":    dict(kind="clip", file="raw/cern_1495704.mp4", credit="CERN", lic="CERN terms (educational/informational use)"),
    "fermilab_anim":  dict(kind="clip", file="raw/v_fermilab_anim.webm", credit="Fermilab", lic="CC BY 3.0"),
    "capitol":        dict(kind="clip", file="raw/v_capitol.webm", credit="Architect of the Capitol", lic="Public domain"),
    "reagan_berlin":  dict(kind="clip", url="v_reagan_berlin", credit="Ronald Reagan Presidential Library / White House Television Office", lic="CC BY 3.0", archive=True),
    "bush_moscow":    dict(kind="clip", url="v_bush_moscow", credit="George H. W. Bush Presidential Library", lic="Public domain", archive=True),
    "clinton93":      dict(kind="clip", url="v_clinton93", credit="William J. Clinton Presidential Library", lic="Public domain", archive=True),
    "border89":       dict(kind="clip", url="v_border89", credit="Wikimedia Commons (Selmsdorf border opening, Nov 1989)", lic="CC BY 3.0", archive=True),
}

def P(src, kb=(0.5, 0.5, 1.0, 0.5, 0.5, 1.12), w=1.0, **kw):
    """Photo. kb = (cx0, cy0, zoom0, cx1, cy1, zoom1) in image-relative coords; zoom 1 = cover the frame."""
    return dict(type="photo", src=src, kb=kb, w=w, **kw)

def C(src, ss, w=1.0, speed=1.0, kb=(0.5, 0.5, 1.0, 0.5, 0.5, 1.08), **kw):
    """Clip from `ss` seconds."""
    return dict(type="clip", src=src, ss=ss, speed=speed, kb=kb, w=w, **kw)

def G(scene, w=1.0, **kw):
    """Graphic scene (keeps the shot's own parameters unless overridden)."""
    return dict(type="graphic", scene=scene, w=w, **kw)

SHOT = dict(type="shot")   # the shot's original graphic from shots.py

VIS = {
    # ---------------------------------------------------------------- cold open
    0: [G("map3d", view="na", title="NORTH AMERICA", hl=["Texas"], sub="SOUTHERN UNITED STATES", big="TEXAS")],
    1: [P("ssc_mdl", kb=(0.55, 0.55, 1.0, 0.5, 0.52, 1.18), frame="print", label="Ellis County, Texas")],
    2: [P("ssc_mdl", kb=(0.35, 0.75, 1.5, 0.6, 0.7, 1.35), grade="cold", w=1.0),
        P("ssc_mdl", kb=(0.8, 0.45, 1.6, 0.7, 0.5, 1.9), grade="cold", w=1.0, pins=[(0.62, 0.47, "MAGNET DEVELOPMENT LAB", "BUILT FOR THE SSC")])],
    3: [SHOT],
    4: [SHOT],
    5: [P("doe_aerial", kb=(0.5, 0.55, 1.0, 0.55, 0.5, 1.25), frame="print", label="Artist's concept, SSC campus")],
    6: [P("ssc_mdl", kb=(0.5, 0.5, 1.25, 0.5, 0.5, 1.4), grade="night")],
    7: [P("doe_sector", kb=(0.45, 0.45, 1.0, 0.55, 0.5, 1.2), frame="print", label="SSC Central Design Group", w=1.0),
        G("timeline", a=1987, b=1993, span=(1987, 1993), label="6 YEARS", w=0.8)],
    8: [G("ring3d", mode="design", labels=True)],
    9: [C("cern_collision", 71.0, kb=(0.5, 0.5, 1.0, 0.5, 0.5, 1.15), credit_tag="CERN")],
    10: [P("bubble2", kb=(0.45, 0.4, 1.0, 0.5, 0.5, 1.5), grade="mono", w=1.0, cap="Particle tracks, bubble chamber"),
         G("particles", mode="question", w=1.0)],
    11: [SHOT],
    12: [SHOT],
    13: [G("title", bg="doe_aerial")],
    14: [SHOT],
    15: [SHOT],
    # ---------------------------------------------------------------- chapter 1
    17: [P("fermilab_aerial", kb=(0.5, 0.5, 1.0, 0.45, 0.5, 1.2), cap="Fermilab, Illinois")],
    18: [SHOT],
    19: [SHOT],
    20: [P("bubble1", kb=(0.8, 0.45, 1.6, 0.78, 0.55, 2.0), grade="mono", w=1.0), G("bigbang", w=1.0)],
    21: [P("fermilab_tunnel", kb=(0.5, 0.5, 1.0, 0.55, 0.5, 1.25), w=1.0, cap="Accelerator tunnel, Fermilab"),
         C("cern_dipole", 49.0, w=1.0, kb=(0.5, 0.5, 1.05, 0.5, 0.5, 1.2))],
    22: [SHOT],
    23: [C("cern_aerial", 98.0, w=1.0), SHOT],
    24: [G("kinetic", bg="fermilab_helium", lines=["AMERICA HAD LED", "PHYSICS SINCE *1945*", "LOSING THAT LEAD", "WAS *NOT AN OPTION*"])],
    25: [C("reagan_berlin", 164.0, w=1.1, cap="President Reagan, 1987"), C("reagan_berlin", 296.0, w=0.8), SHOT],
    26: [SHOT],
    27: [P("doe_location", kb=(0.5, 0.55, 1.0, 0.45, 0.55, 1.3), frame="print", label="Planned ring, Ellis County", w=1.0), SHOT],
    28: [P("doe_magnet", kb=(0.42, 0.45, 1.0, 0.62, 0.4, 1.5), frame="print", label="SSC dipole magnet design", w=1.0),
         C("cern_cryo", 4.0, w=0.9, cap="Cryogenics control room (LHC)")],
    29: [SHOT, C("cern_cms", 13.5, w=1.0)],
    30: [SHOT, P("doc_1989", kb=(0.5, 0.35, 1.0, 0.5, 0.4, 1.25), frame="doc", w=1.0)],
    31: [SHOT],
    32: [SHOT],
    33: [SHOT],
    34: [P("doe_linac", kb=(0.4, 0.5, 1.0, 0.6, 0.5, 1.2), frame="print", label="Linac building, SSC lab", w=1.0),
         P("wax_street", kb=(0.5, 0.55, 1.0, 0.5, 0.5, 1.15), w=1.0, cap="Waxahachie, Texas")],
    35: [C("capitol", 247.5, w=1.0, cap="Washington, D.C."), SHOT],
    # ---------------------------------------------------------------- chapter 2
    37: [SHOT], 38: [SHOT], 39: [SHOT],
    40: [P("doe_magnet", kb=(0.75, 0.25, 2.2, 0.75, 0.3, 2.6), frame="print", label="Problem 2: the magnets")],
    41: [SHOT],
    42: [SHOT],
    43: [SHOT],
    44: [SHOT],
    45: [G("docstack", docs=["doc_1988", "doc_1989", "doc_1991", "doc_1992"])],
    46: [SHOT],
    47: [SHOT],
    # ---------------------------------------------------------------- chapter 3
    49: [C("bush_moscow", 113.0, w=1.0, cap="Moscow, August 1991"), SHOT],
    50: [C("border89", 71.0, w=1.0, cap="1989"), SHOT],
    51: [P("reagan_gorb", kb=(0.5, 0.45, 1.0, 0.55, 0.45, 1.2), w=1.0, cap="Reagan and Gorbachev, 1987"),
         G("kinetic", w=1.2, lines=["NOT A WEAPON", "BUT A *COLD WAR* IDEA", "UNDERSTAND THE UNIVERSE", "*LEAD THE WORLD*"])],
    52: [SHOT],
    53: [P("capitol_dusk", kb=(0.5, 0.5, 1.0, 0.5, 0.45, 1.2), w=1.0, cap="U.S. Congress"), G("split", mode="both", w=1.0)],
    54: [P("doe_concept", kb=(0.5, 0.5, 1.0, 0.5, 0.5, 1.15), frame="print", label="The collider", w=1.0),
         P("freedom", kb=(0.5, 0.5, 1.0, 0.55, 0.45, 1.2), w=1.0, label="The space station", frame="print")],
    55: [P("freedom_model", kb=(0.5, 0.5, 1.0, 0.55, 0.5, 1.2), w=0.8, cap="Space Station Freedom model"), SHOT],
    56: [C("clinton93", 192.0, w=1.0, cap="President Clinton, 1993"), SHOT],
    57: [SHOT, P("doc_1992", kb=(0.5, 0.3, 1.0, 0.5, 0.35, 1.3), frame="doc", w=0.9)],
    58: [P("ssc_mdl", kb=(0.6, 0.55, 1.3, 0.55, 0.55, 1.5), grade="night", cap="Waxahachie")],
    59: [G("kinetic", bg="doe_aerial", lines=["IT LOST", "*ITS STORY*", "NO ENGINEERING", "COULD *FIX THAT*"])],
    60: [SHOT],
    61: [G("ring3d", mode="erase")],
    # ---------------------------------------------------------------- ending
    62: [SHOT],
    63: [C("cern_tunnel", 28.5, w=1.0, cap="Large Hadron Collider, Geneva"), SHOT],
    64: [P("higgs_fermilab", kb=(0.5, 0.5, 1.0, 0.5, 0.45, 1.15), w=1.0, frame="print", label="Fermilab, 2 a.m., 4 July 2012"), SHOT],
    65: [P("ssc_mdl", kb=(0.5, 0.5, 1.0, 0.45, 0.5, 1.15), frame="print", label="Sold, 2012")],
    66: [P("ssc_mdl", kb=(0.3, 0.6, 1.3, 0.5, 0.55, 1.05), grade="cold")],
    67: [SHOT],
    68: [G("ring3d", mode="ghost")],
}
