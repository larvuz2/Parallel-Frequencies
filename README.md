# Parallel Frequencies

**Art × Music × Generative Visuals.** A real-time, browser-based audiovisual engine in which each
historical art movement is paired with its closest musical equivalent. Music played live on a MIDI
keyboard, or from a MIDI or audio file, paints a living canvas.

Live movements:

- **Impressionism — Monet × Debussy.** Every note becomes a brushstroke. The stroke is pressed,
  dragged and lifted by the music, on a lit, textured canvas with drifting air in front of it.
- **De Stijl — Mondrian × Mozart (3D).** The music builds a De Stijl construction in space. Notes
  open planes and blocks on an asymmetric lattice, their edges draw black lines outward, and small
  blocks of colour run along the lines like Broadway traffic. A camera director films it with
  grazing close-ups that slowly open out to reveal the whole architecture.

- **Baroque — Caravaggio × Bach (raymarched 3D).** The whole scene is a signed-distance world,
  ray-marched per pixel. The architecture can be a golden monstrance, a pipe organ, Bernini's
  baldacchino on twisted Solomonic columns, or fractal ornament. It is lit in chiaroscuro by one
  window (soft shadows, ambient occlusion, god rays) and by the music: every note is a candle-light
  travelling the spiral of its contrapuntal voice, and each voice leaves golden dust behind it.

Switch movements with the title dropdown, `M`, or `?movement=baroque` / `?movement=neoplasticism`
in the URL.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static build in dist/ (host anywhere, works offline)
npm run preview    # serve the build
```

Use **Chrome** (or Edge) for a live MIDI keyboard. Safari has no Web MIDI, but files, the demo and
the computer-keyboard piano all work there.

1. Plug in a MIDI keyboard. It is detected automatically and can be hot-plugged.
2. Or press **Open MIDI or audio** (or drop a file anywhere). `.mid` files play on a sampled grand
   piano. Audio recordings (mp3, wav, m4a…) are analysed into notes in real time.
3. Or press **Play demo**. *Rêverie* is an algorithmic study in Debussy's idiom that opens with the
   flute arabesque of the *Prélude à l'après-midi d'un faune*.

### Shortcuts

| Key | Action |
| --- | --- |
| `H` | Hide / show the panel |
| `P` | Performance view (hides everything, cursor fades) · `Esc` returns |
| `F` | Fullscreen |
| `Space` | Play / pause file |
| `← / →` | Seek ±5 s |
| `[ / ]` | Previous / next preset (glides smoothly) |
| `C` `C` | Wash the canvas (press twice) |
| `S` | Save a PNG |
| `R` | Record video (with sound) |
| `D` / `O` | Play demo / open file |
| `M` | Next movement |
| `1`–`7` | *(De Stijl, Baroque)* switch camera move live |

When the **computer-keyboard piano** is on, `A W S E D F T G Y H U J K` play notes, `Z`/`X` shift the
octave and `Space` is the sustain pedal. Shortcuts then need `Shift`.

---

## How the music becomes paint

Each note spawns a **brush agent** (`movements/impressionism/BrushSystem.ts`). The agent moves like
a hand:

| Music | Paint |
| --- | --- |
| **Pitch** | Height on the canvas (horizon layout: low = water, high = sky), the brush type (bass → broad wash, middle → flat / filbert, treble → round / dab), and the colour (register walks the palette dark → light) |
| **Velocity** | Pressure: width, paint thickness (impasto) and opacity. The loudest notes become the **accent**: one luminous stroke per gesture, with its broken reflection in the water (the red sun) |
| **Duration** | How far the brush travels. A held note runs the brush dry; with *Re-stroke* on it re-dips and hatches back beside the first stroke |
| **Release** | The lift-off: pressure eases out and the paint load breaks up on the canvas weave (dry brush) |
| **Chords** | Notes within ~70 ms are one gesture: painted close together and in parallel |
| **Sustain pedal** | Released notes keep painting until the pedal lifts. By default it also makes the paint wetter, so strokes blend more |
| **Harmonic tension** | Dissonance makes strokes bend harder along the flow field |
| **Density** | Busy passages paint with finer brushes |
| **Soft pedal / mod wheel / pitch bend** | Translucency / curvature / curve of the live stroke |

All of these (except the structural ones) are editable connections in the **Mapping** panel. It
shows every live musical signal as a meter, and every connection glows while its signal is active.
Per-note signals (velocity, pitch, duration, interval) swing around their midpoint. Global signals
(pedal, density, tension, loudness…) add on top.

### The painting surface

`PaintSurface.ts` keeps two ping-ponged multiple-render-target (MRT) buffers:

- **paint**: pigment colour, premultiplied by coverage
- **relief**: impasto height · wetness · emission (glow)

Every frame:

1. **Process**: touch smudging (fingers drag wet paint and push up ridges), slow wet-paint drift
   along a curl-noise field, wet-on-wet bleeding, drying, and the "canvas memory" fade. The fade is
   accumulated on the CPU so half-float buffers stay exact.
2. **Strokes**: the frame's ribbon segments are drawn with the bristle shader
   (`shaders/stroke.ts`). This includes per-hair streaks and furrows, broken colour (two pigments on
   one brush), dry-brush catching on the canvas tooth and on old ridges, rounded loaded starts, and
   pickup of wet paint beneath.
3. **Composite**: the paint is laid over the ground (linen, coarse canvas, cotton paper, gesso or
   smooth). It is lit as a relief surface by a moving raking light, with oil sheen on wet paint,
   cavity occlusion, glowing accents, shimmer and an atmospheric veil.

The engine then shows the result on a plane in a 3D stage. The plane drifts subtly, tiny light
motes float in front of it, and the image is finished with bloom, vignette, grain and tone mapping
(pmndrs `postprocessing`).

---

## De Stijl: how the music becomes architecture

| Music | Construction |
| --- | --- |
| **Pitch** | Floor (height) of the form; the column comes from the circle of fifths, so related notes are neighbours |
| **Hands / channel** | Depth layer: the left hand (Alberti bass) builds at the back, the melody in front |
| **Velocity + duration** | Size of the form (cells spanned), line weight, and how far a held form slides forward out of the grid (*key relief*) |
| **Colour** | *Equilibrium*: each new colour is the one the composition lacks most, after Mondrian's balance. Other modes: harmony (tonic red, third yellow, fifth blue), register, pitch class, velocity |
| **Each note** | Its form's edges draw lines outward (merging with existing lines), and a small block of colour runs along one line (Broadway Boogie Woogie) |
| **Loud chords** | A cadence: the whole structure breathes together |
| **Silences** | Phrase endings: the camera cuts to a new view or a new close-up |

**Camera moves** (keys `1`–`7`):

1. **Close-up → reveal.** Grazes along the newest line, then pulls back over *Reveal duration*.
2. **Follow the line.** A low tracking shot along each line as it is drawn.
3. **Fly through the grid.** Travels the lattice corridors.
4. **Phrase cuts.** Classical axonometric views, changing at phrase ends.
5. **Slow orbit.**
6. **Breathing with dynamics.** Close when soft, wide when loud.
7. **Still axonometric.**

Dragging always turns the view and the mouse wheel zooms, on top of any move. Forms near the lens
dissolve so the camera can pass through them, and depth of field follows the subject.

## Baroque: counterpoint in light

| Music | Chapel |
| --- | --- |
| **Voices** | Each note joins the voice whose previous note is nearest (voice leading), or uses its MIDI channel. Voices circle on spirals in alternating directions, so their paths cross like counterpoint |
| **Pitch** | Height of the light on its spiral; on the organ, which pipe speaks (low notes in the tall towers) |
| **Velocity** | Brightness and size of the light |
| **Duration** | How long the light burns; then it fades with the *afterglow* |
| **Harmony** | The key slowly re-folds the architecture (*Harmonic morph*) |
| **Tension** | Twists the ornament and makes the monstrance's flame-rays ripple |
| **Dynamics** | The monstrance's sun-rays grow; the window light swells |
| **Cadences** (loud chords) | The window flares open and recedes |
| **Silences** | Phrase endings: the camera re-frames |

The architectures are SDFs (`movements/baroque/shaders.ts`): a sunburst monstrance, a pipe organ
whose sounding pipes glow, a baldacchino after Bernini, a KIFS folded ornament, Mandelbox chambers
and Apollonian vaults. The march runs at reduced resolution (*Render quality → March resolution*)
and is upscaled. The dust trails are GPU particles, occluded using the march depth.

## Architecture

```
src/
  core/
    Engine.ts          renderer, 3D stage, post-processing, pointers, frame loop
    ParamStore.ts      every parameter; morphing, persistence (localStorage)
    Signals.ts         live musical signals (density, tension, pedal, loudness…)
    Modulation.ts      the source → target mapping maths
    NoteBus.ts         the single event bus all inputs speak through
    engineParams.ts    shared parameters (finishing, performance, source)
    types.ts           Movement / Param / Event interfaces
  input/
    MidiInput.ts       Web MIDI, hot-plug
    KeyboardInput.ts   computer keyboard as piano
    MidiFilePlayer.ts  sample-accurate scheduling; visuals locked to the audio clock
    AudioFilePlayer.ts onset + pitch detection on recordings
    AudioEngine.ts     sampled grand (Salamander, bundled) + hall reverb, pedal logic
    DemoComposer.ts    "Rêverie" — algorithmic Debussy-style demo / idle dream
  movements/
    registry.ts        all movements (Impressionism and De Stijl live, others to come)
    impressionism/     params, presets, palettes, brush system, surface, shaders, atmosphere
    neoplasticism/     De Stijl: lattice world, camera director, depth of field, Mozart demo
    baroque/           raymarched SDF chapel, voice-lights, trails, Bach demo
  ui/                  schema-driven sidebar, dropdowns, transport bar, recorder
```

### Adding a movement

A movement is a self-contained `MovementDefinition` (see `movements/impressionism/index.ts`):

```ts
export const baroque: MovementDefinition = {
  id: 'baroque', title: 'Baroque', pairing: 'Caravaggio × Bach', musical: 'Baroque music',
  description: '…', available: true,
  params: [...],        // rendered automatically in the sidebar, grouped by `group`
  groups: [...],
  presets: [...],
  modTargets: [...],    // what the Mapping panel can drive
  defaultRoutes: [...],
  create: (ctx) => new BaroqueWorld(ctx),   // implements MovementInstance
};
```

`MovementInstance` receives `noteOn / noteOff / control`, gets `update(dt, time, pointers)` each
frame, and exposes an `output` texture. It may add objects to the shared 3D `stage`. The inputs,
transport, mapping UI, presets library, post-processing, recording and performance mode are all
shared. Swap the stub in `movements/registry.ts` and the movement appears in the selector.

---

## For the installation

- **Performance view** (`P`) hides every control. The cursor disappears after a few seconds of
  stillness.
- **Dream when idle**: if nobody plays for a set time, the canvas starts painting by itself (silent
  by default). Live playing takes over instantly.
- **Canvas memory** sets the painting's half-life, so a long-running piece keeps renewing itself
  instead of filling up.
- **Touch**: on a touch screen, visitors can smudge wet paint with their fingers, or paint along
  with *Touch paints*.
- **Performance → Render scale / Paint resolution** let you trade resolution for frame rate on a
  very large display. **Canvas → Weave density** keeps the linen at a natural scale on a big screen.
- Settings persist in the browser and can be exported / imported as JSON from the **Library**
  section. Presets you save travel with the export.
- Fonts and piano samples are bundled, so a built copy runs without internet.

## Credits

- Piano: *Salamander Grand Piano V3* by Alexander Holm, CC BY 3.0, via Tone.js.
- Built with three.js, postprocessing, Tone.js and @tonejs/midi.
