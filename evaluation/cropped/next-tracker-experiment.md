# Detected-person RTMPose and ViTPose experiment

Version 1 — 2026-10-10. Development experiment only; no application code, dependencies, shipped models, thresholds or rewards changed.

**Decision: retain these candidates outside production.** YOLOX found the cropped person in the sampled reproduction, and ViTPose recovered a short visibly plausible forearm segment that RTMPose missed. Neither result establishes reliable whole-repetition tracking. Extended-position elbows still drift onto forearms; hip/knee estimates are inconsistent. A larger model and a convincing skeleton do not establish coaching accuracy.

## Sources and model provenance

The official [RTMPose project](https://github.com/open-mmlab/mmpose/tree/main/projects/rtmpose) provides deployed ONNX assets. The [rtmlib implementation](https://github.com/Tau-J/rtmlib) supplies detector, affine preprocessing and pose decoding. Its convenient empty-box behaviour treats the entire image as a person: this experiment explicitly bypasses pose inference when detection returns zero boxes. The full-image diagnostic was separately named and never treated as a deployable recovery path.

| Component | Source actually used | ONNX bytes | SHA-256 |
|---|---|---:|---|
| YOLOX-M HumanArt detector | [OpenMMLab export archive](https://download.openmmlab.com/mmpose/v1/projects/rtmposev1/onnx_sdk/yolox_m_8xb8-300e_humanart-c2c7a14a.zip) | 101,400,344 | `3dea6513388889f0fff4b77bf7a26013600321b9eb9ceb0e9a400a82572f5f23` |
| RTMPose-M body7 | [OpenMMLab export archive](https://download.openmmlab.com/mmpose/v1/projects/rtmposev1/onnx_sdk/rtmpose-m_simcc-body7_pt-body7_420e-256x192-e48f03d0_20230504.zip) | 54,330,655 | `5c0a4bf67953e6d2ac43ce15e77dc9d5d354ae18430a47d2c5963a7bc5683e3c` |
| ViTPose-B COCO | [easy_ViTPose maintainer ONNX conversion](https://huggingface.co/JunkyByte/easy_ViTPose/resolve/main/onnx/coco/vitpose-b-coco.onnx) | 360,123,609 | `26e215fd6e27305824f13db0a0d0b597c3c4adf030dd66cbadf2228256f4af25` |

ViTPose is from the [original authors' project](https://github.com/ViTAE-Transformer/ViTPose), but the downloaded ONNX is a third-party conversion linked by rtmlib, not an original-author export. Its [model card](https://huggingface.co/JunkyByte/easy_ViTPose) points to the original [Apache 2.0 license](https://github.com/ViTAE-Transformer/ViTPose/blob/main/LICENSE). MMPose and rtmlib also use Apache 2.0; see [MMPose license](https://github.com/open-mmlab/mmpose/blob/main/LICENSE). These observations do not independently clear every training dataset or downstream redistribution right. No model was shipped. The authors' benchmark AP values are not validation of this cropped exercise or form corrections.

## Method and privacy

Inference ran locally in an isolated Python environment, using rtmlib 0.0.15, ONNX Runtime 1.22.1, NumPy 2.5.3 and OpenCV 5.0.0.93. CPU execution used two inference threads and one inter-operation thread. Telemetry was disabled; inference scripts blocked outbound socket connections and loaded local model files. Public model downloads happened before inference. No private pixels, landmarks or reports were uploaded.

The initial screen used six sampled frames from the authorized cropped reproduction, six from a public Navy push-up clip, two empty frames, two duplicated-person composites and two translated-camera composites. The latter controls are synthesized from the same public source, not independent videos. A follow-up sampled a contiguous eight-second private interval at four frames per second. Those 33 correlated frames are not 33 independent subjects or form labels. RTMPose, ViTPose with rtmlib's default colour order, and corrected RGB ViTPose were retained as separate results.

The [public Navy source page](https://commons.wikimedia.org/wiki/File:Navy-seal-buds-training-push-ups.ogv) identifies the source as public-domain US Navy material. Local provenance records the seven-second excerpt and format conversion. The experiment's control is an oblique demonstration, not a labeled form-quality test.

Raw overlays draw joints at raw score ≥0.3 solely to aid inspection. This is **not** an acceptance threshold. Heatmap/SimCC scores are not calibrated probabilities or equivalent to MediaPipe visibility; some exceed 1. No MediaPipe 0.65 rule was applied to them. Person detection success was recorded separately from pose alignment.

## Results from the actual runs

| Control | YOLOX result | Pixel review and implication |
|---|---|---|
| Public Navy, six sampled frames | One person in each | Arms broadly aligned in inspected overlays. Clothing and near/far joints still create ambiguity. This does not establish accurate anatomy or coaching. |
| Empty scene, two frames | No detections | Detector-gated path correctly ran no pose inference. This is a very small negative control, not a false-positive-rate estimate. |
| Duplicated person, two frames | Two detections in each | Separate skeletons were produced. A production single-person review would have to reject ambiguity, not choose the first box. Natural occlusion and missed-person cases remain untested. |
| Translated camera, two frames | One person in each | The skeleton translated with the person in inspected overlays. These isolated samples do not demonstrate rejection of camera-induced motion or temporal stability. |
| Authorized severe crop | Person detection succeeded in sampled frames | RTMPose frequently misplaced elbows and lost the bent arm. ViTPose improved a short bent-forearm interval but still failed outside it; hips/knees were not a dependable alternative. Private diagnostic media and per-frame measurements remain ignored and unpublished. |

The default ViTPose adapter passed OpenCV BGR unchanged. The export publisher's [inference implementation](https://github.com/JunkyByte/easy_ViTPose/blob/main/easy_ViTPose/inference.py) explicitly expects RGB. A separate corrected RGB replay therefore supersedes the initial colour-order result. The correction improved the short forearm interval and its side consistency. Earlier BGR failures remain in the audit trail and must not be cited as the final RGB result.

A post-hoc, manually seeded nearest-previous elbow/wrist association preserved the physical near-arm pair through the inspected short interval. The visible forearm moved toward image vertical and then away. However, nearby duplicate wrist estimates made the assignment margin small in some frames. A unique numerical nearest neighbour does not prove anatomical identity. Extending the window reaches confidently misplaced elbows, so a whole push-up repetition, joint-angle change, phase duration or lowering/raising tempo is **not accepted**. A small in-frame forearm excursion is not equivalent to a full exercise return. This manually selected interval is an investigative observation, not a new automated cue or validation score.

## Runtime and browser feasibility

The initial public Navy CPU screen had median per-frame times of approximately 454 ms for YOLOX plus 31 ms for RTMPose, or 451 ms plus 233 ms for ViTPose. The final RGB Navy rerun measured 454 ms plus 241 ms and retained the same detection counts across all control groups. Two detected people approximately doubled pose work. These are local development timings, excluding model download and initialization; they are not a controlled hardware comparison or browser benchmark. Colour-order correction does not change the model size; both measured runs are retained in local artifacts.

The detector/pose pairs total about 156 MB and 462 MB uncompressed ONNX respectively, before runtime memory and activations. No browser WebGPU/WASM compatibility, mobile memory, quantization or download performance has been tested. These costs do not currently justify a browser fallback that still needs reliable rejection of bad joints.

For a future port, preserve the exact input/output contract rather than copying score thresholds:

- Detector: 640×640 top-left letterbox, constant 114 padding, BGR channel order, NCHW float32; map detected boxes back by the resize ratio. Preserve the exported NMS/output branch and explicitly handle zero/multiple boxes.
- Pose: detected bounding box, 1.25 scale padding, aspect-correct affine crop to 192×256, normalization using the adapter's mean/std, NCHW float32. Use verified RGB for this ViTPose export. The RTMPose run used rtmlib's native input pipeline.
- RTMPose decoding: SimCC x/y maxima with split ratio 2 and affine mapping back. ViTPose decoding: heatmap peaks plus DARK/UDP refinement, then mapping back. Both yield COCO's 17 joints, not MediaPipe's 33 or world-space landmarks. Off-image predictions stay unobserved; do not invent missing points or pass them through an incompatible 33-joint adapter.

Implementation references: [RTMPose adapter](https://github.com/Tau-J/rtmlib/blob/main/rtmlib/tools/pose_estimation/rtmpose.py), [ViTPose adapter](https://github.com/Tau-J/rtmlib/blob/main/rtmlib/tools/pose_estimation/vitpose.py), and [YOLOX adapter](https://github.com/Tau-J/rtmlib/blob/main/rtmlib/tools/object_detection/yolox.py). The local experiment pinned package versions rather than assuming these moving source links remain unchanged.

## Reproduction and next decision gate

The local-only environment, downloads and scripts are under ignored `.tools/rtmpose-evaluation/`. Results are under ignored `frontend/artifacts/rtmpose-experiment/`: `results.json`, `continuous/`, `vitpose/`, `vitpose-continuous/`, `vitpose-rgb/` and `vitpose-rgb-screen/`. Each run records versions, model hashes, detections, raw joint coordinates/scores and per-stage times. Private source paths are read from an ignored manifest; they are not copied into this document. The scripts are experimental local artifacts, so a clean public checkout cannot reproduce the private test.

Before integration, independently annotate visible near-arm endpoints and genuinely hidden endpoints on consented development clips; freeze detector/association/rejection rules without selecting them for a desired coaching output. Evaluate temporal identity, off-screen hallucination, static poses, motion blur, natural multiple people and camera motion. Keep source subjects separate in held-out tests. Report endpoint localization, visibility rejection and accepted-episode coverage separately from complete-cycle detection. Form-correction accuracy still requires independent expert fault labels. Neither this experiment nor a higher model score supplies those labels.
