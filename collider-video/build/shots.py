"""Shot list for "The Real Reason America Abandoned the Biggest Machine Ever Planned".

Each entry is one shot. `say` is the narration (also used for SCRIPT.md); `tts` overrides the
spoken text where the voice needs help with a number or a name. `scene` picks a renderer in
render.py; the other keys are that scene's parameters. `cap` is a typed lower-left caption,
`card` wraps the scene in a tilted photo print with a yellow tape label.
"""

TITLE = "The Real Reason America Abandoned the Biggest Machine Ever Planned"

S = []
def shot(say, scene, tts=None, **kw):
    S.append(dict(say=say, tts=tts, scene=scene, **kw))
def chapter(text):
    S.append(dict(chapter=text, scene="chapter", text=text))

# ---------------------------------------------------------------- cold open
shot("In the middle of the Texas prairie, about thirty miles south of Dallas,",
     "map", view="na", title="NORTH AMERICA", hl=["Texas"], sub="SOUTHERN UNITED STATES", big="TEXAS")
shot("there's a cluster of empty buildings surrounded by cattle fields.",
     "field", mode="surface", card="Ellis County, Texas")
shot("No signs. No museum. From the highway, it looks like a warehouse park nobody finished.",
     "field", mode="surface", wide=True)
shot("Underneath those fields is a tunnel. A concrete tube bored through solid chalk,",
     "field", mode="cutaway", label="AUSTIN CHALK")
shot("more than fourteen miles long.",
     "tunnel", big="14+ MILES")
shot("It was supposed to be the first piece of the biggest scientific machine ever attempted.",
     "ring", mode="design")
shot("But it was abandoned.", "field", mode="night")
shot("For six years, thousands of engineers and physicists worked toward a single goal:",
     "timeline", a=1987, b=1993, span=(1987, 1993), label="6 YEARS")
shot("build a ring fifty-four miles around,", "ring", mode="design", labels=True)
shot("smash particles together harder than anyone ever had,", "ring", mode="collide")
shot("and find out what the universe is actually made of.", "particles", mode="question")
shot("By 1993, they'd dug more than fourteen miles of tunnel and spent two billion dollars.",
     "ring", mode="progress", year="1993", value="14+ MI", caption="TUNNEL BORED  ·  $2B SPENT")
shot("They needed fifty-four. They never got there.", "ring", mode="progress", rest=True)
shot("This is the story of the Superconducting Super Collider.", "title")
shot("Why did America try to build it? What went wrong?", "questions", hi=1)
shot("And why did the United States walk away from the biggest machine in history?",
     "questions", hi=2, pre=2)

# ---------------------------------------------------------------- chapter 1
chapter("The race to the smallest thing in the universe")
shot("By the nineteen-eighties, physicists had a problem.", "particles", mode="dim", cap="1980s")
shot("Their best theory of matter, the Standard Model, worked almost perfectly. But it had a hole in the middle of it.",
     "particles", mode="build")
shot("The theory needed one more particle, the Higgs boson, to explain why anything has mass at all.",
     "particles", mode="higgs")
shot("Nobody had ever seen it. And the only way to find it was to recreate the conditions a fraction of a second after the Big Bang.",
     "bigbang")
shot("That meant a particle accelerator. A ring of magnets that pushes protons to nearly the speed of light, then slams them into each other.",
     "ring", mode="beams")
shot("The bigger the ring, the harder the collision. The harder the collision, the more of the universe you can see.",
     "ring", mode="grow")
shot("Europe was already building big machines at CERN, near Geneva.",
     "map", tts="Europe was already building big machines at Cern, near Geneva.",
     view="europe", title="WESTERN EUROPE", pin=(6.05, 46.23, "CERN"), sub="GENEVA, SWITZERLAND", big="CERN")
shot("American physics had led the world since the Second World War. Losing that lead was not an option.",
     "kinetic", lines=["AMERICA HAD LED", "PHYSICS SINCE *1945*", "LOSING THAT LEAD", "WAS *NOT AN OPTION*"])
shot("So in 1987, Ronald Reagan approved the most ambitious science project the country had attempted since Apollo.",
     "stat", tts="So in nineteen eighty-seven, Ronald Raygun approved the most ambitious science project the country had attempted since Apollo.",
     year="1987", value="APPROVED", caption="BIGGEST U.S. SCIENCE PROJECT SINCE APOLLO")
shot("His advice to the team was two words. \"Throw deep.\"",
     "quote", tts="His advice to the team was two words. Throw deep.", text="“Throw deep.”", who="RONALD REAGAN, 1987")
shot("The design was enormous. A ring 87 kilometres around.",
     "map", tts="The design was enormous. A ring eighty-seven kilometres around.",
     view="ntx", title="NORTH TEXAS", ring=True, sub="DESIGN, TO SCALE", big="87 KM")
shot("Ten thousand superconducting magnets, each one cooled with liquid helium to minus 269 degrees Celsius.",
     "magnet", tts="Ten thousand superconducting magnets, each one cooled with liquid helium to minus two hundred and sixty-nine degrees Celsius.",
     mode="basic")
shot("Two beams of protons, each carrying 20 trillion electron volts, colliding head on at 40.",
     "ring", tts="Two beams of protons, each carrying twenty trillion electron volts, colliding head on at forty.",
     mode="collide", labels=True)
shot("In 1988, the government picked a site in Ellis County, Texas.",
     "map", tts="In nineteen eighty-eight, the government picked a site in Ellis County, Texas.",
     view="ntx", title="NORTH TEXAS", sub="SITE SELECTED", big="ELLIS COUNTY", cap="1988")
shot("The ground there was Austin Chalk. Soft enough to bore through fast, solid enough to hold a tunnel for decades.",
     "strata")
shot("By 1991, the giant boring machines were in the ground.",
     "shafts", tts="By nineteen ninety-one, the giant boring machines were in the ground.", mode="tbm", cap="1991")
shot("Seventeen shafts were sunk from the surface.", "shafts", mode="shafts")
shot("Laboratories went up. Two thousand people moved to a small town called Waxahachie.",
     "field", tts="Laboratories went up. Two thousand people moved to a small town called Wawksa-hatchee.",
     mode="build", card="Waxahachie, Texas")
shot("And then, with the hardest part already underway, Washington had something else to say.",
     "map", view="na", title="NORTH AMERICA", pin=(-77.04, 38.9, "WASHINGTON"), sub="CONGRESS", big="WASHINGTON")

# ---------------------------------------------------------------- chapter 2
chapter("What went wrong")
shot("The first problem was the price.", "bars", show=0, label="PROBLEM 1  ·  COST")
shot("In 1987, the collider was pitched at about 4.4 billion dollars.",
     "bars", tts="In nineteen eighty-seven, the collider was pitched at about four point four billion dollars.", show=1)
shot("By 1991, it had nearly doubled. By 1993, it was over eleven billion.",
     "bars", tts="By nineteen ninety-one, it had nearly doubled. By nineteen ninety-three, it was over eleven billion.", show=3)
shot("The second problem was the magnets.", "magnet", mode="basic", label="PROBLEM 2  ·  MAGNETS")
shot("Early tests showed the beam might wander inside its pipe. The fix was to widen the opening of every magnet by a single centimetre.",
     "magnet", mode="widen")
shot("Multiplied across ten thousand magnets and fifty-four miles of ring, that one centimetre cost a fortune.",
     "magnet", mode="grid")
shot("Then, the partners disappeared. The plan assumed other countries would pay part of the bill.",
     "map", view="world", title="THE WORLD", hl=["Japan", "Germany", "France", "United Kingdom", "Italy", "India", "South Korea", "Canada"],
     sub="FOREIGN PARTNERS", big="EXPECTED")
shot("Japan was asked again and again. It never committed. Almost nobody else did either.",
     "map", view="asia", title="EAST ASIA", hl=["Japan"], sub="JAPAN", big="NO DEAL")
shot("Then came the auditors. Congressional investigators reported weak cost controls and poor management.",
     "docs")
shot("Every report became a headline.", "headlines")
shot("But the biggest blow didn't come from inside the project at all. It came from the other side of the world.",
     "map", view="world", title="THE WORLD", hl="USSR", sub="1991", big="USSR", still=True)

# ---------------------------------------------------------------- chapter 3
chapter("Why the money won")
shot("In 1991, the Soviet Union collapsed.",
     "map", tts="In nineteen ninety-one, the Soviet Union collapsed.",
     view="eurasia", title="NORTHERN EURASIA", hl="USSR", split=True, sub="DECEMBER 1991", big="COLLAPSE", cap="1991")
shot("And with it went the argument that had kept big American science funded for forty years.",
     "timeline", a=1950, b=1993, span=(1950, 1991), label="COLD WAR SCIENCE")
shot("The collider had never been a weapon. But it was born in a Cold War mindset: the country that understood the universe best would lead the world.",
     "kinetic", lines=["NOT A WEAPON", "BUT A *COLD WAR* IDEA", "UNDERSTAND THE UNIVERSE", "*LEAD THE WORLD*"])
shot("When the rival disappeared, so did the urgency.",
     "map", view="eurasia", title="NORTHERN EURASIA", hl="USSR", fade=True, sub="THE RIVAL", big="GONE")
shot("Congress went looking for savings. And there were two giant science projects on the table.",
     "split", mode="both")
shot("The collider. And a space station.", "split", mode="each")
shot("In June 1993, the space station survived a vote in the House by a single vote.",
     "vote", tts="In June nineteen ninety-three, the space station survived a vote in the House by a single vote.")
shot("The collider wasn't so lucky. In October 1993, Congress cancelled it.",
     "split", tts="The collider wasn't so lucky. In October nineteen ninety-three, Congress cancelled it.",
     mode="cancel", cap="October 1993")
shot("The official reason was money. The deficit was huge, and a machine only physicists could explain was an easy thing to cut.",
     "stat", year="1993", value="$11B+", caption="FINAL ESTIMATE  ·  THE OFFICIAL REASON")
shot("But the people who worked there have said something else since.", "field", mode="night", cap="Waxahachie")
shot("The project had lost its story. Nobody outside physics could say why it mattered, and no amount of engineering could fix that.",
     "kinetic", lines=["IT LOST", "*ITS STORY*", "NO ENGINEERING", "COULD *FIX THAT*"])
shot("For six years, Cold War ambition had kept the collider alive.",
     "timeline", a=1987, b=1993, span=(1987, 1993), label="KEPT ALIVE")
shot("When the Cold War ended, the collider ended with it.", "ring", mode="erase")

# ---------------------------------------------------------------- ending
shot("The physicists scattered. Many of them ended up on Wall Street, building models for banks.", "chart")
shot("In 2012, a smaller machine in Europe, the Large Hadron Collider, found the Higgs boson.",
     "ring", tts="In twenty twelve, a smaller machine in Europe, the Large Hadron Collider, found the Higgs boson.",
     mode="compare", cap="2012")
shot("The discovery America had spent two billion dollars chasing was announced in Geneva.",
     "particles", mode="found")
shot("That same year, the Texas site was sold to a chemical company.", "field", mode="surface", card="Sold, 2012")
shot("Today, there's nothing to see. Just empty buildings and a field of grass.", "field", mode="surface", wide=True)
shot("Below it, fourteen miles of tunnel are still down there, slowly filling with water in the dark.",
     "field", mode="water")
shot("What would they have found at forty trillion electron volts?", "ring", mode="ghost")
shot("Nobody knows.", "black", hold=1.2)
S.append(dict(scene="end", text="Superconducting Super Collider", dur=4.0))
