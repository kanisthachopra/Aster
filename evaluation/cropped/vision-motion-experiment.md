# Motion reasoning candidate: Kimi-K3

Inspected and tested 10 October 2026. Status: experiment only; no production model or environment change. Private images, paths, hashes, per-frame descriptions and generated personal advice stay in ignored artifacts. Nothing here constitutes training or an accuracy benchmark.

## Capability and request contract

[Nebius's Kimi inference page](https://nebius.com/services/token-factory/models/kimi-models-inference) lists vision-capable Kimi models. The authenticated model list and public catalog metadata were checked before calling `moonshotai/Kimi-K3`. [Nebius's physical-AI workbench](https://github.com/nebius/nebius-physical-ai/blob/main/docs/workbench/token-factory.md) documents its `reasoning_effort` handling and warns that generated judgments need validation. A catalog entry is not visual-performance evidence.

The experiment uses the fixed [chat-completion endpoint](https://docs.tokenfactory.nebius.com/api-reference/inference/create-chat-completion), six chronologically numbered JPEG data URLs per request, actual image timestamps, JSON-object output and `store:false`. No full videos, health information, account details, raw landmarks, URLs for private media, tools or browser credentials are supplied. A 55-second deadline bounds each call. `store:false` does not guarantee every aspect of provider retention.

The first prompt asks for visible/hidden regions, at most two observations with input-frame indices, an observation/strength/practice distinction, one cue and a reason. It excludes hidden anatomy, injury, muscle activation, force/pressure, safety, sets/reps/load and numerical confidence. A second prompt asks for per-frame visible facts and one discussion question about movement/contact/variation. It explicitly separates near-surface appearance from definite weight-bearing contact. Those prompts are experimental; a request restriction does not prove model compliance.

## Actual requests, including failures

Six new image-inference requests reached Nebius in this experiment: two public requests and four requests using an explicitly approved twelve-image preview. The four private calls use the same approved images in two passes, not additional stills or full recordings. Two sandbox transport failures before the second pass did not reach the provider; the subsequent network-enabled calls are counted below. Earlier Gemma/MiniCPM outcomes remain in the separate seven-request historical ledger.

| Input and setting | Actual transport/result | Release decision |
| --- | --- | --- |
| Six public Navy stills; initial reasoning setting, 2,500-token cap | HTTP 200, 27.701 seconds; output hit the cap and JSON was incomplete. 1,967 input / 2,500 output tokens recorded. | Reject. HTTP success does not mean usable structured output. |
| Same six public stills; `reasoning_effort:low`, 4,096-token cap | HTTP 200, 7.276 seconds; complete JSON and finish reason `stop`. 1,968 input / 417 output tokens, including 46 reasoning tokens. | Exercise/motion description is feasible, but no independently verified specific correction. Sparse phase descriptions remain uncertain. |
| Two approved six-image sets; first motion prompt | Two HTTP 200 responses with complete JSON. | Valid JSON is insufficient evidence of a useful, correct form adjustment. Personal findings stay private. |
| Same two approved sets; per-frame discussion prompt | Two HTTP 200 responses with complete JSON. | More contextual discussion, but unsupported contact/effort implications and temporal ambiguity remain. Do not publish generated advice automatically. |

Private calls retained prompt hashes, exact approved image hashes, timestamps, request/served model, finish reason, usage and timing locally. Public aggregate evidence is in `public-vision-motion-results.json`; its exporter reads only two explicitly allowlisted public records. No private output is included in Git.

## Why this is not the production answer yet

A sequence of stills can show different positions without resolving motion between them. Similar successive positions do not prove an intentional pause, a slow tempo, a completed repetition or continuous contact. Clothing near a surface does not establish weight support. A conditional “if” does not make an unsupported preceding observation true.

A generated question about intent can be useful, but its premise still needs verification. Model prose must not override a failed local visibility/continuity gate or become a detected fault simply because it sounds caring. The shipped provider remains context-only Gemma; local measured moments and reviewed education remain separate.

Before accepting a motion-generating route: freeze a strict observation/card contract; independently label actual visible regions and movement intervals; test no-person/wrong-exercise, cropped-hidden-region, camera-motion, cut/frozen/reordered-frame and deliberate-variation controls; compare accepted facts/cues blindly with qualified reviewers. Measure false claims and useful coverage separately, with denominators. The existing unlabelled 600-video corpus cannot establish an 80% correction result for this candidate.
