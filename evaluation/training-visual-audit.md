# Training-only visual audit

Audited 2026-10-08. This is a bounded failure analysis, not an accuracy report or exercise-form annotation.

## Scope and method

The input was the nine failure IDs in ignored `evaluation/cache/training-diagnostics.json`, a snapshot of 89 available **training** records. Each ID was checked against the locked manifest and confirmed to have `split: train` before its video or pose cache was opened. No validation or test video, prediction, image or pose record was viewed for this audit. No benchmark record, source label, split or media file was removed or changed.

For each clip, three frames were extracted at cached timestamps nearest 15%, 50% and 85% of actual duration. Existing pose landmarks were overlaid, using visibility >=0.45 only for visualization: wrists pink, other selected joints yellow, skeletal connections green. Two clips with no detections at those representative timestamps were additionally inspected at their first, middle and last detected samples. This used 33 frame decodes total, one FFmpeg process with one decoding thread at a time, without new pose inference. Contact sheets and the extraction scripts remain ignored under `frontend/artifacts/evaluation/training-audit/`; no source imagery is redistributed in this document.

Three or six sampled frames do not establish every movement in a clip. Observations below describe visible capture/tracking patterns and hypotheses for training-stage testing, not diagnoses of the person's technique.

## Observed patterns

| Training source ID | Source action | Visible evidence and likely failure mechanism |
|---|---|---|
| `9emEijq7gmc` | Pull-up | Low, tilted, blurry indoor view with severe upper-body cropping and camera movement. No pose at the three representative times; extra detected samples show incomplete torso/leg chains and mostly missing hands. Only 7/32 sampled frames contain a pose in the diagnostic snapshot. Sparse lower-body evidence does not establish a squat. |
| `LLiStJjNqwc` | Pull-up | Outdoor bar sequence includes an above-bar, muscle-up-like position, then a hanging position. The shoulder can pass above the gripping hand; a static requirement that every wrist stay above the shoulder does not cover this sequence. Broad dataset action labels and a strict conventional pull-up template are not identical scopes. |
| `_S9I5Nog0u8` | Pull-up | Narrow, oblique gym framing, hanging with knees bent, followed by standing/rest with the arms lowered. Working wrists are close to the upper boundary and less consistently measurable than the legs. Averaging orientation over the entire clip blends the exercise interval with rest/setup. |
| `z7SzKk1oLmE` | Pull-up | Head, hands and bar are outside the upper frame; the exerciser's knees bend while hanging. At 1.55 s the overlay places the wrist markers down near the shoes despite the visible arms extending upward. Later representative frames lose the pose entirely. Visibility scores alone do not prove anatomically valid joint assignment. |
| `OUQKb8Qwqg8` | Pull-up | Backlit hanging interval at 1.55 s, standing with arms lowered at 5.11 s, then walking toward the camera and becoming tightly cropped at 8.42 s. Rest and approach-to-camera are not evidence of a different exercise. |
| `CgWZGGXYwLE` | Pull-up | Crowded outdoor exercise event. All three extra detected samples (0.02, 6.39, 9.96 s) track standing spectators rather than the athlete hanging on the bar; the final tracked spectator differs from the earlier one. The input skeleton represents the wrong person, so better exercise thresholds alone cannot solve this case. |
| `iKKkKrJNDTs` | Pull-up | Multiple people in a narrow outdoor space. At 1.31 and 4.66 s the skeleton follows a standing helper on the right; by 7.76 s it follows the exercising person near the center. High pose coverage conceals a target-identity switch. |
| `_0s9oacFJkg` | Pull-up | Oblique hanging footage with strong knee tucking and body swing. Visible knee-angle cycles can resemble squat cycles, while the hands remain attached overhead. The snapshot reports two apparent squat cycles; those should not be treated as squat evidence without support/anchor context. |
| `gV3dgCS0hWU` | Squat | Clear side-view knee/hip bending and return, with arms reaching forward and overhead. Raised wrists are a normal visible part of this sequence, not sufficient evidence of hanging or a pull-up. The current wrist-above-shoulder rule makes much of the clip incompatible with the squat station. |

## Generalizable hypotheses to test on training data

1. **Require positive temporal evidence for an activity.** An upright torso with feet below the hips, or an absent/unmeasurable wrist, does not positively identify a squat. Few usable samples should remain uncertain instead of selecting whichever category has the most weakly compatible frames. Keep useful visible-position observations separate from confirmed activity identity.
2. **Compare support anchors over a contiguous movement interval.** In hanging footage, a sufficiently visible hand may remain near one image location while the torso moves relative to it; in a squat, the feet may remain near the floor while the hips/knees move. Combine anchor stability, joint excursion and their temporal relationship. Normalize displacement by torso scale. A fixed absolute pixel threshold will vary with framing, and camera motion can invalidate both tests.
3. **Do not make overhead wrists a universal squat veto.** Squats with arm reaches, overhead loading or other arm positions need lower-body movement evidence. Conversely, knee flexion alone does not distinguish a squat from hanging with tucked legs.
4. **Handle setup, rest and exit as separate intervals.** Look for consistent short sequences of compatible movement rather than letting standing/rest frames determine the identity of the entire clip. Do not invent cycles across missing detections or across a target switch.
5. **Treat target continuity as a prerequisite.** Sudden changes in body center, scale, limb proportions or person location can flag potential identity switches. These are ambiguity signals, not proof of identity. The single-person pose stream cannot reliably choose the intended athlete in a crowd; a user-selected region/person or genuine multi-person tracking would require separate extraction work and validation.
6. **Check geometry plausibility before interpreting high-confidence landmarks.** Gross limb-length changes, wrist estimates near the feet when the arms exit the top edge, and incomplete chains can invalidate angle interpretation. Such checks must not reject valid foreshortened or cropped views merely for looking unusual; otherwise abstention can become another framing bias.

These hypotheses were sent to the analysis agent. This audit did not change the model, extraction, metrics or station rules. Any calibration must use training groups only, with validation used according to the locked protocol and the final test set kept unseen until the implementation is frozen.

## Limits

The examples were selected because they failed in an incomplete, class-imbalanced training snapshot. They cannot estimate population prevalence or final benchmark performance. Source labels indicate broad activity categories, not good/bad technique, and no form-fault label was added. Source-video groups are not person- or channel-disjoint. Multi-person tracking and ambiguous movement variants may require abstention; the requirement to preserve all clips in the benchmark remains unchanged.
