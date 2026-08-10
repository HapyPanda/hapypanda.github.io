# Expressive deconstructed torn-paper collage

Reusable Image Generator standard for blog and project card artwork.

The identity of this style comes from **torn-paper material, abstract
deconstruction, tactile layering, and an editorial-art composition**. It does
not come from one fixed pale palette or a mandatory white background. Let the
subject decide how quiet, vivid, dark, warm, sparse, or dense the image should
be.

## How to invoke

Say: **“Use the personal-site torn-paper collage standard.”**

Before generation, fill these variables:

| Variable | Meaning | Example |
|---|---|---|
| `[SUBJECT AND SCENE]` | The recognizable subject plus its action or setting | `one eye hidden among torn-paper cherry blossoms` |
| `[POSITION AND COMPOSITION]` | Where the visual mass sits and how it moves through the frame | `a fractured diagonal mass rising from the lower-left` |
| `[PALETTE AND CONTRAST]` | Colors and the intended strength of their contrast | `deep cobalt, paper white, vivid pink, and charcoal; high contrast` |
| `[BACKGROUND MATERIAL]` | The background color or paper surface that supports the idea | `warm kraft-envelope paper with subtle fibers` |

Current card default: square `1:1`. Keep the important recognizable cues away
from the extreme edges so the image remains legible at thumbnail size.

Visual reference: [`references/panda-collage.png`](references/panda-collage.png)
Use it for torn fibers, layering, physical shadows, and abstract construction;
do not copy its pale palette or white background unless they suit the subject.

## Base prompt

```text
Create an expressive, abstract, deconstructed torn-paper collage depicting
[SUBJECT AND SCENE].

Construct the important visible forms from hand-torn cotton paper, fibrous
handmade paper, thin rice paper, painted paper, and optional small fragments of
aged newsprint. Preserve rough deckled edges, exposed fibers, creases,
abrasions, peeled corners, uneven paper thickness, imperfect overlaps, torn
gaps, and shallow natural shadows between layers.

Keep the subject recognizable, but do not resolve it into a neat, complete
illustration. Interrupt, offset, cover, fragment, or dissolve selected parts of
its contour into abstract paper masses. Use a clear hierarchy of a few large
structural pieces, irregular medium fragments, and only as many small scraps as
the composition needs. Avoid evenly sized pieces and regular mosaic repetition.

Use [POSITION AND COMPOSITION]. The composition may be sparse or dense,
balanced or deliberately unstable, but it should feel intentional and
editorial rather than decorative. Negative space is a tool, not a quota: use
the amount that best supports the subject and keeps the focal point legible at
thumbnail size.

Use [PALETTE AND CONTRAST]. Color may be muted, saturated, dark, luminous, or
high-contrast when the concept benefits from it. Give the palette a reason:
color separation, interruption, rhythm, and collisions between fragments may
carry meaning. Do not automatically wash every color into pastel tones.

Use [BACKGROUND MATERIAL]. The background may be white, colored paper, kraft
paper, envelope stock, newsprint gray, or another restrained physical surface.
It should still read as a real, simple material beneath the collage rather than
a digital gradient or a fully illustrated scene.

Photograph the finished collage directly from above. The result should feel
raw, tactile, poetic, imperfect, and handmade, like an experimental
independent-zine artwork. Favor torn gaps, misregistration, missing pieces,
unequal visual weight, and intuitive placement over polished illustration.

If newsprint is used, keep it cropped or partly hidden as texture; do not allow
readable sentences, titles, or captions. Do not add a watermark, mockup frame,
or decorative border.
```

## Non-negotiable checks

- The artwork visibly reads as physical torn and layered paper, not smooth
  digital painting or a regular mosaic.
- The subject remains recognizable while selected contours stay unresolved,
  displaced, interrupted, or abstracted.
- Fragment sizes and visual weight vary clearly; composition has a deliberate
  focal hierarchy.
- Palette, contrast, background material, and negative space serve the specific
  concept instead of following a universal preset.
- Any newsprint is cropped and unreadable.
- No title, caption, watermark, mockup, or decorative frame.

## Optional direction controls

Add only the controls that help the specific image:

- `quiet / atmospheric`: lower contrast, more open space, softer paper colors
- `fractured / tense`: stronger color collisions, sharper gaps, displaced forms
- `dense / immersive`: overlapping masses and less empty background
- `graphic / iconic`: one dominant silhouette with bold color blocks
- `archival / reflective`: aged paper, restrained contrast, sparse newsprint

These are choices, not requirements. A series should share the material
language while allowing each subject to have its own emotional temperature.
