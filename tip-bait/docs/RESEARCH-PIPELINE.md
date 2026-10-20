# How an AI agent should make this trailer (post-mortem + research)

## What went wrong in v1
1. **Reviewed stills, not motion.** QA was single frames and 0.33 s contact sheets. Popping, IK jitter, foot sliding, camera clipping, dead frames and bad cuts only show in motion, so they shipped.
2. **No animatic.** Finished shots were built straight from a script. Direction problems (unclear beats, unreadable text, weak joke timing) were found only after an expensive render.
3. **Hand-built everything.** Citi Tower was a box model, the city was extruded OSM footprints, and characters were MakeHuman with Mixamo clips plus hand-rolled IK for contact moments (handing over the cup, sipping). Contact acting is the hardest thing in CG, and here it was done with hacks.
4. **Scope too wide.** There were 13 staged shots in 33 s, each with its own set, characters and HUD. Breadth won over quality.
5. **Self-review by the same model, on thumbnails.** The reviewer never saw the video at speed.
6. **CPU rendering (SwiftShader) at 4–8 s per frame.** Each full iteration took 1–2 h, so iteration was avoided.

## Techniques that fit this job
| Need | Technique | Notes / requirements |
|---|---|---|
| Real Downtown Orlando, recognisable Citi Tower | **Google Photorealistic 3D Tiles** in three.js via NASA-AMMOS `3d-tiles-renderer` + `GoogleCloudAuthPlugin` | Real photogrammetry of the actual buildings. Great for aerials and establishing shots; melty at street level. Needs a Google Maps Platform API key. |
| Street-level Citi Tower entrance that matches Street View | **Gaussian splat / photogrammetry** of the corner from a 1–2 min phone walk-around (Polycam, Luma, Scaniverse) | Photoreal at eye level. Needs someone to film the corner. |
| Believable people acting (Kyle's sip, the shrug, the facepalm) | **Image-to-video models** (Kling 3, Veo 3.1) seeded with a character reference sheet and a first frame | Keep clips 3–5 s, reduce motion if the identity drifts, and use one reference per role. Needs a model account or API key. |
| Engine-accurate layout + photoreal look | **Video-to-video restyle** (Luma Modify Video, Runway Aleph) over a clean blocking render | Keeps camera, motion and structure from the render. Clips are limited to 5–10 s. Never send the UI through it; composite the HUD afterwards. |
| Direction | Music → beat sheet → storyboard → **animatic** with temp audio → sign-off → blocking → final | Most iterations happen in the animatic, where they are cheap. |
| QA | **Deterministic checks before rendering**, then **VLM review of motion** | Before rendering: subject occlusion raycasts, camera-in-geometry checks, feet on ground, text inside the safe zone, no black or dead frames. Then the reviewer watches frame strips at 8–10 fps per shot and the full cut at speed. |

Research backing the QA split:
- Agentic animation pipelines that critique rendered frames with a VLM still miss layout issues that humans catch (Manim agent study, arXiv 2601.13453).
- Symbolic checks of the scene before rendering are cheaper and deterministic (SGA, arXiv 2607.18116).
- Iterative VLM question-and-answer loops improve generated video (VQQA, arXiv 2603.12310).

## Recommended v2 pipeline
1. Pick and lock the track first, and cut to it at 150 BPM.
2. Write a tighter script with 7 beats, one idea each:
   - Hook / the bait
   - Closed store
   - Gauntlet montage (bus, tourists, storm, train)
   - Real vs game
   - Citi Tower pull-up
   - Kyle
   - Tip takeaway, then the end card
3. Build an animatic from stills with timing, captions and temp audio. Get it approved before any final render.
4. Render locations from real data: 3D Tiles for aerials, plus a splat or best-effort model for the entrance.
5. Make the people shots as AI image-to-video clips from reference sheets of Kyle S and the courier, with first frames taken from the engine's renders so they cut together.
6. Composite the HUD and captions as a separate, deterministic layer.
7. QA gates on every pass: automated checks, motion-strip review, then a full watch-through by an independent reviewer at real speed.
