# JJK 235 "Hollow Purple" fan animatic: plan

This is a non-commercial fan animation of *Jujutsu Kaisen* chapter 235 (Inhuman Makyo Shinjuku Showdown, Part 13), by Gege Akutami.
It's a coloured motion-manga: every frame is drawn procedurally in Canvas2D and JavaScript, with no images, audio or traced art.

## What the chapter does (research)

| # | Beat | Source of truth |
|---|------|-----------------|
| 1 | Gojo's earlier Black Flash pushes his reverse cursed technique back to full output. His severed right arm regrows and he grins. | ch.235 |
| 2 | Sukuna feels unease for the first time in a thousand years. | ch.235 |
| 3 | Gojo knocks Mahoraga away, trades blows with Sukuna and throws him into the shikigami. He lands another strike and starts a chant. | ch.235 |
| 4 | Sukuna reads the chant as **Red** and has Mahoraga ready to take the hit and adapt. | ch.235 |
| 5 | **Feint:** Gojo fires Red straight up. The Blue that ate Agito (ch.234) is still hanging in the sky. Sukuna orders Mahoraga to break it. Blue's pull slingshots Gojo, and he cuts Mahoraga down before it reaches the orb. | ch.235 |
| 6 | Sukuna fires an imitation **Piercing Blood** (a water jet) to set off Red early. Gojo hits him, but the jet is already away. | ch.235 |
| 7 | Gojo chants **Blue** to strengthen it, and the jet bends into the orb instead. | ch.235 |
| 8 | Full chant, then **Hollow Technique: Purple**. Red and Blue collide over Shinjuku. In the observation room, Yuta admits he'd only have held Gojo back. | ch.235 |
| 9 | Imaginary mass flattens the district. Mahoraga and its wheel are erased. Sukuna survives, broken and missing a hand. Gojo is barely hurt: "a remote Purple". | ch.235 |
| 10 | Kusakabe: Gojo's output is back and Sukuna is crippled. **Gojo has won.** | ch.235 |

The chant lines are the standard ones from the series: Red is *"Phase. Twilight. Eyes of Wisdom."*, Blue is *"Phase. Paramita. Pillars of Light."*, and Purple is *"Nine Ropes. Polarized Light. Crow and Declaration. Between Front and Back."*
The rest of the dialogue is paraphrased, not quoted from the translation.

## Direction: motion manga (the real pages, brought to life)

**The source art is the asset.** Every character, background and SFX comes from the actual chapter 235 pages, cut out and animated. Nothing gets redrawn.

The only generated imagery is overlay FX that sit on the manga's own linework: Blue, Red, Purple, Black Flash, speedlines and shockwaves.

### Assets (not in git)
- Page images go in `pages/`, named `235-01.png` … `235-19.png`, plus the last pages of ch.234 for the Blue setup.
- They come from the user's own copy. `pages/` is gitignored, so the repo only holds code and the cut sheet.

### Pipeline
1. **Read every page** and write `cuts.json`. Each panel gets its polygon, and inside it the layer masks: background, Gojo, Sukuna, Mahoraga, FX, SFX lettering and bubbles.
   - Try automatic segmentation first, then hand-trace polygons where it fails.
2. **Layering:**
   - Cutout layers sit over a background plate. Areas revealed behind a character are filled from nearby tone and screentone, or just covered by keeping the camera move small.
   - Each layer gets a depth for parallax.
3. **Colour** goes under the ink, never over it:
   - Flat tint regions per layer use `multiply`, so the original line art stays crisp.
   - Technique glows use `screen` and `lighter`.
   - Hollow Purple floods the page violet.
4. **Motion vocabulary**, using real anime timing:
   - The camera travels the page right-to-left in reading order, then dives into a panel until it fills the screen.
   - Push-ins and dutch tilts.
   - Character layers get breathing, a slight sway and drifting hair-mask edges.
   - Hits get a 3–4 frame hit-stop plus decaying shake.
   - 1–2 frame impact frames: the line art inverted.
   - Smears go *between* keys, never on the impact pose.
   - Acting runs on twos and FX on ones.
   - The original SFX lettering slams in on the beat.
5. **Render:** `renderFrame(f)` is deterministic. Headless Chromium renders the frames, then ffmpeg encodes the MP4.

### Verification (how an agent checks an animation)
- **Mask overlays:** every cut is drawn over its page, to catch masks slicing hair or hands.
- **Contact sheets** per shot, at 8 evenly spaced frames, so a reviewer sees the motion at a glance.
- **Motion-energy check:** mean absolute frame difference per frame. It flags any stretch of 0.5s or more that's effectively static.
- **Beat check:** a reviewer compares each shot's contact sheet with its source page and the beat table above. Fix one thing at a time and re-render.

## Reference: notL86's "Gojo VS Sukuna Animation" (ch.234–235)

https://youtu.be/fRVzCmJMTQ8, voice over by ShadeRonin. It's hand-animated frame by frame, but its *look* is the target:
- 2.39:1 cinematic letterbox bars over a 16:9 frame.
- Akutami's own ink stays dominant: black-and-white line art with solid blacks, no cel shading.
- Colour is a single soft tint per scene (pale pink wash) instead of full colouring. Saturated colour is saved for the techniques (Blue, Red, Purple).
- The camera is always moving: slow push-ins and low hero angles on held poses.

What this means for our cutouts:
- Keep the page ink untouched.
- Tint the paper per scene with `multiply`.
- Reserve saturated colour for the cursed-technique FX.
- Letterbox everything.
