---
doc: prd
status: approved
---

# Exercise Form Feedback — Product Requirements

An immersive first-person space experience for people practicing pull-ups, push-ups, and squats independently, guided by a robot through personal setup, exercise selection, and evidence-linked video feedback. This is a descriptive working title, not a final brand name.

The learner approved this product direction and the soundtrack-reference interpretation on 2026-10-07 by asking to continue forward after review. This document includes the accepted routine defaults originally proposed for review, while preserving their provenance below. The full game experience is required, following the learner's explicit expansion beyond the original hackathon time budget. Technical feasibility, implementation choices, and audible prototypes are the next work in 4-spec; product approval does not establish that the analysis or audio has already been built or validated.

Sources: `scope.md > Revised Project Direction`, `The Unique Kernel`, and `Who It's For`.

## Supported Devices

The learner chose a computer-browser first release on 2026-10-07. The complete first-person experience targets a computer with keyboard and mouse; no desktop installation is required. Phone support is future work. A mobile interface or connected phone-recording workflow is not part of the first release; users provide an exercise-video file available on their computer.

## The Core Journey

1. Open a minimal game-style title screen with a small menu on the left over an image representing the experience. The background can be still or subtly animated; it is silent before the user starts. Selecting the primary start action activates audio and begins the first-person cutscene on another planet or moon: inspect the protagonist's arms and partly transparent suit, look around, and notice a distant destination. There is no introductory marketing page.
2. After the initial cutscene, see a holographic choice between "New to this world" and "Already a user." The returning-user branch goes directly to robot-led code-ID and password entry. Successful sign-in restores personal records and progress; this branch bypasses first-time guided movement and account setup.
3. For a new user, explore a broad lunar basin using WASD and mouse look. Terrain initially conceals the habitat; a corner survey map offers orientation and an unidentified signal. Remove the short prescribed pathway and obstacle course. Space remains an optional jump control. After the opening theme reaches its high point during the entry choice, a mellower version of the same musical texture continues behind instructions and movement. Breathing and the surrounding landscape reinforce the space setting.
4. Reach the exercise park and enter its introductory cutscene. The learner wants an initial unsuccessful exercise attempt and robot encounter; the proposed ordering is park reveal, brief struggle, then robot greeting.
5. Talk with the robot in an RPG-style dialogue. It asks how to address the user and their age, and asks them to create their own code ID and password. The learner's narrative is that this restricted, war-zone world requires authorization to return. Offer an optional four-to-five-photo personal-reference step and explain its intended purpose. Skipping photos permits exercise-video review; an accuracy benefit or penalty is not established.
6. Answer the robot's question about which exercise to do now: pull-ups, push-ups, or squats.
7. Follow a direction marker or arrow lines on the floor toward the chosen station. The park remains an explorable environment with additional, currently unavailable exercise equipment.
8. Activate the station with a familiar game interaction key. E is the working candidate; the learner permits an appropriate common key.
9. Watch the protagonist begin the selected exercise, with voiced avatar dialogue and low, mellow music. The scene pauses partway through and a metallic blue holographic panel covers approximately three fifths of the screen. Music fades toward silence or very sparse, quiet notes while the user reads and acts on instructions.
10. Read camera-position and capture instructions, then submit an exercise video through the panel's file uploader. The first-use dialogue explains that the robot needs information about the user's real exercise form.
11. Watch an analysis state. The intended display includes stick-figure body mapping, an observation checklist, and a comparison between the user's video and an appropriate reference demonstration.
12. Inspect feedback tied to specific frames or frame ranges. See relevant similarities and differences, supported suggested adjustments, what remains uncertain, and reference attribution. A difference from a reference is presented as an observation requiring interpretation, not automatic proof that the user's form is wrong.
13. Leaving before finishing returns the player near the station without daily completion or credits. The robot gives a short, situational encouragement to finish. If analysis cannot assess the recording, it instead explains the problem plainly and requests another upload without witty criticism.
14. Completing a review leads to a cutscene in which the avatar represents the captured exercise movement, then demonstrates the suggested adjustment. Human-like avatar dialogue and a robot congratulation acknowledge receiving feedback. The depiction must be labeled according to what the analysis supports; a suggested movement is not proof that the user's real-world form has improved.
15. After a usable analysis, viewing feedback, and finishing the station experience, exit the station to commit daily completion and the applicable credits. Until that exit, the activity remains pending. The first qualifying exit triggers the first-mission notification and sound, task icon, and Master Control introduction. Multi-day missions encourage continued participation and supported progress; exact day boundaries and improvement criteria remain to be defined.
16. Return to the park to choose another exercise or review another attempt. An unusable clip can be replaced within the panel; a processing failure permits retry. Neither path grants rewards until a usable review is finished and the station is exited.
17. Use an in-game journal to revisit daily exercise videos and feedback, and a reference library to view the professional demonstrations for supported exercises.
18. On a later visit, choose the returning-user branch and sign in through the robot to regain access to personal progress and records. Recognizing a returning browser is an arrival cue, not authorization to display private information.

Sources: `scope.md > The Core Loop`, `Game Interaction Direction`, and `What "Working" Looks Like`.

## Screens and Layout

The experience has one continuous game world with contextual dialogue and a review overlay, rather than unrelated dashboard pages.

### First-person World

The arrival route, space park, exercise stations, floor guidance, protagonist body, and robot are part of the environment. Short control prompts teach the guided arrival. The learner wants few controls and components, with a clear purpose for the experience.

### Game Title Screen

A minimal RPG/game-style entry screen shows a small left-aligned menu over a representative world image, which may remain still or have subtle motion. No music or other audio plays before a deliberate start action. Start activates audio and begins the established opening cutscene; the first sound remains breathing and minute details, with the grand theme entering later. The learner's mention of five options is illustrative rather than a settled list. Working labels are "Start" and "Settings"; additional menu actions are not invented. Preserve the new/returning-user choice after the opening cutscene instead of duplicating account entry in the title menu. The final image, degree of motion, and exact menu copy can be refined during the build.

### Holographic Entry Choice

After the opening cutscene, present two clear choices: "New to this world" and "Already a user." The new-user branch starts movement instructions and the route to the park. The returning-user branch opens robot-led sign-in without replaying the onboarding route. The opening choice is available even when this browser has not visited before, so a person with an existing account can sign in.

### Robot Dialogue and Personal Setup

Conversation choices resemble RPG dialogue. The robot asks questions, collects the agreed user-entered information, guides code-ID and password creation, and offers optional reference-photo submission with an explicit skip action. The story frames account creation as authorization to return to this restricted world. Proposed additional context and layout are identified under Proposed Defaults for Review.

### Holographic Exercise Review

A metallic blue panel occupies approximately three fifths of the screen over the paused game scene. It contains capture instructions, a file uploader, analysis status, a user/reference video comparison, an observation checklist, and frame-linked findings. Holographic exit and action buttons appear toward the bottom. The proposed internal arrangement is specified under Proposed Defaults for Review.

### Missions and Milestones

After the first usable review has been viewed and the user finishes and exits the station, a notification and sound announce mission completion. A task icon appears at the top of the screen; activating it reveals remaining tasks, daily missions, and milestones for consistent participation and observed progress.

### Robot-led Sign-in

The returning-user interaction is part of the game: the robot requests the user's code ID and password. Password entry uses a private, masked input. The robot's narrative dialogue surrounds authentication; credentials must not be put into the AI conversation, voice dialogue, journal, or analysis inputs.

### Journal and Reference Library

The learner references the in-game journal experience of God of War as inspiration. A journal control opens day-organized entries containing the user's videos and feedback. A "Master Control" section within the journal manages settings and deletion of specific feedback items, photos, or videos. A library control opens professional reference demonstrations for supported exercises. Exact controls and layout should remain consistent with the game experience; no new visual world has been chosen for these views.

Sources: `scope.md > Inspiration & Identity` and `The Product Boundary`.

## Look and Feel

- Immersive first-person sci-fi presentation with cinematic transitions, a planet or moon landscape, visible stars, and a futuristic but spatially understandable exercise park.
- The learner imagines a transparent or glass-like enclosure as a possible park treatment, floating pull-up bars, a push-up area, and a squat area with weights. The enclosure is exploratory; the stations and space setting are established requirements.
- Visible arms and physique within a partly transparent space suit. Running, looking around, and jumping connect the arrival scenes.
- Sound begins with near-silence and prominent breathing, then grows into a grand sci-fi theme toward the end of the opening cutscene and holds its high point during the entry choice. Subsequent music uses quieter related variations, voiced avatar/robot dialogue, and sparse or silent backgrounds during instructions and controls; the detailed sequence is specified below.
- A robot guide, RPG-style dialogue choices, floor-path guidance, metallic blue holographic panels, and holographic controls.
- Duolingo remains an inspiration for memorable characters and engaging habits. The learner's first-person-game references inform presentation; combat has not been requested.
- Font, exact palette beyond the blue review panel, lighting details, and exact robot appearance are not established. Translate the supplied direction into a coherent design during technical planning without reopening the overall identity.

Source: `scope.md > Inspiration & Identity` and the learner's PRD interview. God of War's journal is an interaction reference supplied by the learner, not a request to copy its assets.

### Music and Sound Direction

Music is a required part of the immersive product identity. The learner explicitly asks to define how it sounds, not only where it plays. Their descriptions are exploratory direction that can be revised before approval, not a locked composition or selection of existing tracks.

The learner supplied soundtrack references on 2026-10-07 and authorized translating them into a coherent sound direction. [The companion music brief](sound-design.md) records every reference, verified identities, explicit placements, and proposed interpretations. The Martian is the learner's closest overall reference. Explicit assignments are Narnia's "Only the Beginning of the Adventure" for first walking, Casper's "One Last Wish" for finding the park, Letters from Iwo Jima's "Main Titles" for reaching the park, American Beauty for the robot becoming alive, and Inception for intervals. Interstellar, The Lord of the Rings, Batman Begins, and After the Dark are broader references without specified excerpts or placements.

Proposed synthesis: a human journey through a vast world, moving from awe and isolation to discovery, companionship, and purposeful practice. Use a shared original theme in grand and sparse variations, combining warm orchestral sounds, restrained electronics, and small chiming/plucked phrases. Instruments and placements not explicitly assigned by the learner remain creative proposals. Develop an original score or use appropriately licensed assets; the reference list does not authorize embedding the named recordings. No audio has yet been auditioned or composed in this planning pass.

| Moment | Learner's intended sound |
| --- | --- |
| Opening body/suit inspection | Near-silence dominates. Breathing is prominent, with only minute additional sounds; do not begin immediately with a loud theme. |
| Realizing this is a new world | During the latter part of the opening cutscene, introduce a grand, grandiose sci-fi theme, rising to a crescendo at the cutscene's end. The learner references the feeling of large sci-fi show/game themes without selecting a specific composition. |
| New-user/returning-user choice | Hold the theme's high point while the holographic choice is on screen, until the user decides. |
| After selecting a branch | Move into a mellower background version that retains the grand theme's musical texture. It is quieter, not necessarily sweet or sentimental. |
| New-user instructions and movement | Continue and develop that background theme through forward movement, jumping, and looking around. Instruction/decision moments use the quieter, sparse treatment below. |
| Reaching the park | Play a distinct arrival/goal cue with the sense of reaching a milestone. God of War's goal-completion sounds are an emotional/interaction reference, not selected assets to reproduce. |
| Robot-awakening cutscene | Clearly present robot startup, electrical/mechanical whirring, activation, and approach sounds. Exact music under this sequence is not yet specified. |
| Robot greeting and onboarding | Transition to a mellower variation of the theme with a more positive, potentially major-leaning character reflecting arrival at the intended destination. It may differ from the route variation but retains the shared musical identity. Voiced dialogue is interspersed; reading/decision moments use the quieter treatment below. |
| First station approach and mini-cutscene | The avatar speaks a voiced line while low, mellow background music continues. As the instructions appear, music moves toward silence to permit focus. |
| Holographic instructions, decisions, Master Control, and upload | Use silence or a very low background texture with substantial rests. Short phrases comprise a single note or a small group of about three or four notes, then return to silence. The sound should make the interface feel alive without overwhelming the user. This applies broadly to interaction panels; the explicitly described opening entry-choice crescendo remains its own cue. |
| Video analysis | Add digital processing sounds that suggest a futuristic computer working: clicks or possible keyboard-like typing, matching the activity already represented visually. The sound signifies processing rather than musical grandeur. Exact timbres and patterns remain to choose. |
| Analysis complete and feedback presentation | Show the feedback while the robot speaks it in short segments. Corresponding text appears alongside the speech so the review feels live and responsive. Keep the area's quiet background music underneath; the voice leads the explanation. |
| First completed station exit | Play the milestone/goal cue with a visible first-mission notification and draw attention to the mission tab. The park's quiet area music continues underneath. Completion is recorded in the mission view and associated with the journal's exercise record. The cue and notification follow the qualifying exit, not merely analysis completion. |
| Missions, journal, and Master Control | Mostly silence or very low music containing substantial rests. Occasional robot interaction is permitted, while reading and decision-making remain the focus. Opening a menu does not repeat the first-mission celebration. |

Voiced avatar and robot dialogue recurs between gameplay moments, giving both characters personality and human texture. The learner describes these as non-diegetic dialogue/voiceover and wants the robot's situational wit reflected in spoken lines, alongside the avatar's thoughts and comments. Exact voice character, delivery, and spatial presentation are not yet specified. Written instructions and dialogue need to remain readable; the sparse musical treatment supports focused interaction.

Feedback presentation is both spoken and visible, with short robot explanations and corresponding on-screen text. It is not just a static result sheet. The milestone cue draws attention to the mission tab after the successful exit, over continuing quiet area music. Missions, journal, and settings return to the sparse reading-focused treatment. The soundtrack reference map and proposed instrumentation are now in sound-design.md. Exact excerpts, voice character, tempo, harmony, and sound on returning visits remain open for refinement. Composition, seamless cue implementation, and permitted media sourcing belong in 4-spec after the direction is reviewed.

Observable requirements from the current description:
- The opening lets breathing and near-silence establish the scene before the grand theme enters.
- The opening crescendo reaches its high point at the end of the opening cutscene and remains present during the entry choice.
- Choosing a branch leads to a mellower variation with recognizable continuity of musical texture.
- Park arrival has its own milestone cue, distinguishable from the robot's startup sounds.
- Robot onboarding has a more positive background variation rather than continuing the opening at its peak.
- The first station mini-cutscene includes voiced avatar dialogue over low, mellow music, followed by a quieter instruction phase.
- Holographic reading, decision, settings, and upload views permit silence and substantial rests between brief musical phrases.
- Avatar and robot dialogue occurs throughout the experience rather than only in the initial greeting.
- Analysis has digital processing sounds associated with its active processing state; the background does not require continuous loud music.
- Feedback text and the robot's short spoken explanations correspond; the written feedback remains available when voice audio is muted.
- The first qualifying station exit coordinates its milestone sound, visible notification, and attention cue for the mission tab over the quiet area background.
- Mission completion is visible in the mission view and linked to the relevant journal activity.
- Missions, journal, and Master Control emphasize silence or very quiet musical phrases with rests rather than continuous busy audio.

## Features and Behavior

### Guided Arrival

After the opening holographic choice, the new-user branch enables WASD exploration and mouse look in a broad natural basin, with optional Space jumping. This supersedes the original W-only pathway and obstacle course following hands-on feedback on 2026-10-07. The habitat is initially concealed by terrain, then discovered by exploration. A corner survey map shows position, heading and a faint unidentified signal. Reaching the entrance advances into the park introduction. The returning-user branch goes directly to robot-led sign-in.

Acceptance criteria derived from the learner's description:
- The first arrival shows the space setting and protagonist perspective without a marketing landing page.
- The game title screen has a minimal left-aligned menu and silent representative background before Start.
- Starting activates the opening audio sequence; it does not jump straight to the grand theme or bypass the opening cutscene.
- The holographic choice distinguishes new users from people with an existing account.
- Returning-user selection reaches sign-in without requiring the onboarding movement route or account creation again.
- Exploration has concise controls, usable mouse look even when pointer capture is denied, and an expandable corner map. Escape and panels release mouse look.
- The player can reach the park and see the robot introduction.

Source: `scope.md > Game Interaction Direction`.

### Habitat Arrival and Visual Revision (2026-10-07)

The park is a large glass dome: its exterior conceals the equipment, while its interior permits a view of the landscape, planets and stars. Entering initiates a third-person view of the suited traveller approaching, then returns to first-person as the habitat powers up. Lighting reveals the three supported stations progressively. Future sectors remain dim and physically inaccessible.

ORBIT begins dormant inside a service machine in a corner of the park. Shutters, motor whirring, activation tones and glowing eyes accompany startup. The traveller comments on the discovery; the robot approaches, speaks and starts personal setup. Subtitle timing follows these distinct beats. More natural articulated hands, mineral terrain, weathered boulders, small roaming creatures, richer celestial rendering and restrained title typography motion are required art directions. Procedural geometry establishes these interactions; final character fidelity remains a production task, not a claim of photorealism.

### Robot Onboarding and Personal Reference

The robot asks the user's preferred name and age and guides creation of the user's chosen code ID and password during this first conversation. The narrative explains that the restricted world requires an ID and password for future authorization. It then offers four or five photos in different positions as an optional personal reference. Explain the intended purpose before requesting any photos. The user may skip because they cannot provide photos, prefer privacy, or simply choose not to; exercise-video review remains available. Additional user-entered context is proposed below; purposeful photo poses require validation in 4-spec.

The product must explain what information it actually uses. The photo step must not claim a demonstrated accuracy improvement or a penalty for skipping until measured; `scope.md > Evidence to Investigate` records the research lead. The learner explicitly acknowledges that the proposed benefit is conjecture. Inferring personality or demographics from appearance is not an established capability.

Acceptance criteria:
- Explain the purpose and optional nature of the reference photos before upload.
- Provide a clear skip action without requiring a reason.
- Skipping reaches exercise selection and permits video review without reference photos.
- Present uncertainties based on available evidence; do not invent an accuracy score or a reduction caused by skipping.

Source: `scope.md > The Core Loop`, `The Product Boundary`, and `Evidence to Investigate`.

### Exercise Choice, Navigation, and Station Entry

The robot offers pull-ups, push-ups, and squats as dialogue choices. Selecting one produces guidance toward its station. On arrival, an interaction starts the matching exercise animation and opens the review experience after the animation pauses. Visible stations for unsupported exercises communicate that access is not yet available. Mini-games are future work.

Acceptance criteria:
- Each of the three choices guides the player to the corresponding station.
- Station entry identifies the chosen exercise and launches the matching review flow.
- Unsupported stations do not imply that their exercises can be analyzed.

Source: `scope.md > Game Interaction Direction` and `The Product Boundary`.

### Exercise Video Submission

The panel explains how to position the camera and record an appropriate clip for the selected exercise before submission. The user provides one exercise per clip using a file uploader. Feedback begins only after a usable video has been supplied.

Acceptance criteria:
- The instructions and panel identify the selected exercise.
- The user can submit a video and see that it is being processed.
- The chosen exercise remains clear throughout the review.

If the recording is unusable, the robot requests a replacement video and explains a known capture problem when evidence supports it. Preserve the selected exercise and show capture guidance with the uploader again. A processing failure offers retry without claiming a form finding. Neither failed path completes a daily task. Numerical video limits and processing estimates belong in 4-spec, not this product interview.

Source: `scope.md > The Product Boundary`.

### Analysis Display and Reference Comparison

Show processing status and the intended body-mapping visualization. The comparison presents the user's exercise video alongside an appropriate reference demonstration, with observations of similarities, differences, and what cannot be assessed.

Product clarification for review: any displayed body tracking, findings, or matching checks must correspond to actual analysis. Decorative processing animations must be distinguishable from measured results. A loading animation alone is not evidence that movement was understood.

Acceptance criteria:
- The user can distinguish processing from completed findings.
- The reference is exercise-relevant and attributed, with an accessible supporting source.
- Observations identify the video moments being compared and acknowledge unclear evidence.
- Inferred tracking or form observations are not fabricated to make the display look complete.

Reference selection, permission to use reference media, comparison methodology, and measurable analysis performance belong in the technical plan. None has been selected yet.

Source: `scope.md > The Unique Kernel` and `What "Working" Looks Like`.

### Frame-specific Feedback

Each finding points to a particular frame or frame range in the submitted video. It explains the visible observation, a possible adjustment, relevant supporting evidence, and uncertainty. The learner explicitly wants feedback that acknowledges possible errors in the analysis and explains which reference differences informed the suggestion.

The robot speaks feedback in short segments paired with the corresponding on-screen text. The display changes with the spoken explanation, creating a live review experience. Written feedback remains independently inspectable when voice audio is muted; listening to audio is not an additional requirement for earning completion. Spoken explanations must preserve the uncertainty and evidence in the written findings.

Acceptance criteria:
- Findings let the user locate the associated moment in their own video.
- The user can inspect the supporting reference and explanation.
- Insufficient evidence leads to a clear uncertainty message and useful recapture guidance.
- Similarity or dissimilarity to one demonstration is not labeled as conclusive evidence of exercise correctness.
- Spoken feedback corresponds to the visible finding and does not express greater confidence than the written explanation.
- Muting voice audio preserves access to all written findings, evidence, and the completion action.

The proposed navigation and arrangement appear below. The post-feedback avatar demonstration extends explanations into the game world.

Source: `scope.md > The Unique Kernel` and `The Core Loop`.

### Exit Before Feedback

The user may cancel and leave before finishing the review. Return them to a standing position near the station and give a brief robot response appropriate to voluntarily abandoning the process. The learner wants encouragement to finish, with a witty line such as "Your workout won't finish itself—come back when you're ready to complete the review." This dialogue does not prevent leaving. No daily-task completion, Energy Credits, or completed-review reward is granted.

When the robot cannot analyze the recording, use direct, helpful language rather than witty criticism: "I couldn't assess this recording. Please upload another video." Explain the specific visibility or capture problem when known, show relevant instructions, and permit replacement upload. Do not imply that an analysis failure means the person did not try or exercised incorrectly. A processing failure similarly permits retry without inventing findings; cancellation remains available.

Acceptance criteria:
- Cancellation closes the panel and returns to the park near the station, without requiring a successful review.
- No completed-review reward is granted for abandoning a review.
- The robot's short cancellation response permits continued exploration and another exercise choice.
- An unassessable recording triggers plain recapture guidance and a replacement-upload action, without witty criticism or rewards.
- A processing failure permits retry or cancellation and does not fabricate exercise feedback.

Source: `scope.md > Review Exit and Progression`.

### Avatar Feedback Demonstration

After receiving feedback, show the avatar performing a representation of the user's captured movement, transitioning to an illustration of the suggested adjustment. The avatar can express effort and understanding in short human-like dialogue, and the robot congratulates the user on receiving their first feedback. The avatar represents the person without requiring photorealistic likeness.

This is an instructional reconstruction whose fidelity must be validated. A movement that cannot be reconstructed reliably must not be presented as an exact replay. The suggested adjustment must remain consistent with the evidence and uncertainty expressed in the review, and must not be described as proof of a real-world correction.

Acceptance criteria:
- The demonstration concerns the selected exercise and the supported findings from that review.
- The original-movement representation and suggested adjustment are distinguishable.
- Uncertain or unobserved movements are not fabricated as exact captured behavior.
- The demonstration and short dialogue connect back to the feedback rather than substituting for it.

Source: `scope.md > Review Exit and Progression`.

### Daily Missions and Multi-day Milestones

Celebrate the first completed station exit after a usable review with a mission notification and milestone sound over the continuing low park music. Introduce and draw attention to a task icon at the top of the screen. Its task view shows the completed mission, remaining missions, daily tasks, and longer milestones; the journal provides the associated exercise record. Mission and journal views use mostly silence or low music with substantial rests, with occasional robot interaction.

The learner defined participation as returning, submitting a new video of the same or another supported exercise, receiving a usable analysis, viewing feedback, finishing the station experience, and then exiting it. They also want progress milestones that compare technique across sessions, with five-day, weekly, and ten-day milestones as examples. Separate recorded participation from demonstrated improvement. The five-day participation milestone uses a streak: an unprotected missed day resets its current count to zero. This reset does not erase earlier journal entries, completed achievements, or recorded practice history.

#### Station Completion and Credit Update

Commit the daily activity task and applicable Energy Credits only when the user exits the station after its required video-analysis-and-feedback flow is complete. Uploading a clip, analysis finishing in the background, or displaying feedback while the user remains in the station does not commit completion. Until the qualifying exit, show the activity as pending completion. A clip that cannot support a usable assessment requires another recording and cannot satisfy the review requirement. Feedback may acknowledge uncertainty; successful analysis must not imply perfect confidence or perfect exercise form.

Acceptance criteria:
- The station requires a video, usable completed analysis, and viewed feedback before its rewarding completion path is ready.
- Credits and daily activity remain unchanged while the station's completion is pending, even after feedback is displayed.
- A qualifying station exit commits completion and the appropriate reward together.
- An unusable recording or failed analysis grants no completion or credits.
- Repeated exit actions or reopening the same completed review do not award the task again.
- The first qualifying exit triggers the mission celebration and introduction of task access and Master Control.

The learner mentions direct video recording as a possible alternative to uploading a file; in-app recording is a capture option to investigate rather than a fully specified additional flow. Cancellation and retry are established above. The proposed "Finish review and return to park" action below makes the completion exit explicit.

#### Energy Credits and Streak Protection

Credits are earned by completing the week's numbered activity tasks, not given for signing up or merely returning at a weekly boundary. The learner replaced the initial and weekly free allowances with this system. In the story, physical workouts generate Energy Credits that power the Empire's exercise park and robot; stored energy lets them continue operating on a protected missed day. This is fictional world-building, not a claim that the app physically harvests energy or measures real electrical output. Real-money credit purchases and spending credits on additional content are requested only for the deferred future roadmap.

| Completed weekly activity task | Energy Credits earned | Total earned before spending |
| --- | ---: | ---: |
| Day 1 | 5 | 5 |
| Day 2 | 5 | 10 |
| Day 3 | 5 | 15 |
| Day 4 | 2.5 | 17.5 |
| Day 5 | 2.5 | 20 |

After completing these five weekly tasks, additional activity earns no more regular credits in that week. Completing actual activity on both remaining days can qualify for the separate reserve reward described below. The app permits further exercise review and records the practice. A qualifying activity remains submitting a new exercise video and viewing its feedback. Product clarification for review: each numbered weekly task awards its credits once, with at most one qualifying activity-day advancement per day; repeating reviews or resetting the streak does not repeatedly award the same task.

The user can spend 10 Energy Credits to protect one missed day from resetting the streak. With no protection applied, the missed day resets the current streak to zero. Show the cost, available balance, and whether the day is protected. Protection preserves continuity without being described as a submitted workout or evidence of technique improvement. The learner sets an upper limit of three protected missed days per week, subject to having enough earned and carried credits.

**Approved seven-day reserve reward:** add 2.5 Energy Credits to the saved reserve only when the user completes qualifying activity on all seven distinct days of the week and does not spend that week's regular credits on missed-day protection. Completing only five or six actual activity days earns no reserve contribution, even if a missed day was protected. The learner explicitly replaced the five-day reserve reward that was independent of spending. Simply keeping regular credits unspent is not sufficient without seven actual activity days.

Existing reserve carries forward intact; it is not reduced to 12.5% at each weekly boundary. Four qualifying seven-day weeks, totaling 28 actual activity days, earn a cumulative 10 reserve credits, enough for one additional protected day if the reserve has not been spent. This replaces the earlier 20-activity-day target. A qualifying week earns the reserve contribution once; repeated reviews cannot award it again.

The regular activity-task rewards total 20; the separate seven-day reward adds 2.5 to the reserve, making the total earned across both balances 22.5 for a qualifying full week before applying the reserve cap. Display the balances and reward types distinctly. Spending regular credits does not deduct from existing reserve but disqualifies the current week from earning a new reserve contribution. Choosing to spend reserve credits on protection deducts them. Reserve protection does not create a real activity day or qualify a missed day for the seven-day reward.

**Approved weekly reset:** at the start of a new week, unused regular Energy Credits reset to zero and the five weekly activity tasks become available to earn again. The saved reserve carries forward intact; it is not reset, reduced, or topped up automatically. The regular balance begins the new week at zero and grows only through completed activity tasks. This weekly reset does not erase journal history or reset an otherwise maintained streak, and it does not award the previous week's completion contribution twice.

**Approved reserve cap:** the saved reserve cannot exceed 100 Energy Credits. At a cost of 10 per protected day, a full reserve funds ten protected days in total; the previously specified limit of three protected days per week still applies. Clamp any reserve contribution at 100 and show when the reserve is full. The precise weekly boundary and reserve-spending interaction remain to finalize. Do not restore the superseded 40-credit cap, proposed 10-credit reserve cap, or free weekly allowances.

Product clarification for review: a protected missed day preserves the practice count without adding a completed practice day, so five actual qualifying practice days are still required. The precise protection-use interaction/window, day/week boundaries, fractional-credit rounding, and the relationship between weekly task resets and the continuing streak remain to finalize.

After continued practice over weeks, offer an optional transformation-photo milestone: upload a new photo and compare it with earlier photos. This comparison supports reflection on visible change; any achievement claiming a particular transformation requires a defined, supportable criterion. Photo upload remains optional, including for users who skipped the initial photos.

Acceptance criteria currently established:
- The first qualifying station exit after a completed review introduces the mission-completion moment and access to the task view.
- The task icon opens the remaining-task and milestone view.
- Leaving before feedback does not complete the review mission.
- Mission claims describe the event actually recorded; receiving feedback is not evidence of improved exercise technique.
- Day-organized exercise submissions and viewed feedback support participation tracking.
- Progress comparisons link to the relevant earlier and later exercise records and distinguish supported change from uncertain results.
- Transformation-photo comparisons do not require users to waive the optional-photo choice or make unsupported improvement claims.
- Completed weekly activity tasks award 5, 5, 5, 2.5, and 2.5 Energy Credits, totaling 20 before spending; there is no initial or weekly free allowance.
- The sixth and seventh actual activity days award no regular credits; completing the qualifying seven-day week awards the separate reserve contribution once.
- A repeated completion of the same weekly task cannot award its credits again.
- No more than three missed days can be protected in one week, and every protection requires sufficient available credits.
- A successful one-day protection costs exactly 10 credits; an insufficient balance cannot pay for protection or become negative.
- An unprotected missed day resets the current streak to zero, while preserving journal history.
- A protected day is distinguishable from a completed practice day and makes no form-improvement claim.
- Five or six actual activity days, a protected missed day, or spending regular credits on protection prevent that week's reserve reward.
- Seven actual qualifying activity days with no regular-credit protection spending earn 2.5 reserve credits once, subject to the cap.
- With no reserve spending, four qualifying seven-day weeks accumulate 10 reserve credits for one additional protected day.
- The saved reserve never exceeds 100; a full reserve funds ten protections in total, with no more than three used within one week.
- Regular-credit spending does not reduce existing reserve, and reserve protection does not count as a completed activity day.
- A weekly rollover resets unused regular credits to zero and renews weekly activity tasks, while retaining saved reserve, journal history, and any maintained streak.
- Weekly rollover grants no free credits and cannot duplicate a previously awarded completion reward.
- The robot introduces the journal's Master Control after the first completed exercise-video-and-feedback mission.

Source: `scope.md > Review Exit and Progression`.

### Returning User and Account Access

The opening holographic panel offers new-user and returning-user choices. A returning user chooses their branch and the robot presents private code-ID and password inputs. Successful sign-in restores the user's journal, mission state, and agreed saved information. Recognizing a browser alone must not expose a person's videos, photos, feedback, or progress.

A new user creates their own code ID and password during the robot's first preference/setup conversation at the park. Account creation is framed as authorization within the story. Code ID is the sign-in identifier; the preferred name used in conversation is a separate value. Sign-in labels use "Authorized ID" and "Authorization password." Exact validation rules remain to be defined. No credential value is requested or stored in this planning document.

#### Restore Authorization

The learner requests a story-based recovery action rather than a generic "Forgot password" label. Imperial Earth or an intergalactic organization is an example of the intended fiction, not a settled organization name. Proposed wording for review: "Restore my Imperial authorization."

**Approved recovery command:** initial setup issues a private, securely generated recovery command after ID and password creation. The user saves it separately. Recovery presents three themed prompts for its three parts, all of which must match, ignoring capitalization. These are parts of a generated secret, replacing guessable personal-question answers. This case-insensitive rule concerns recovery responses; it does not change normal password matching. The complete command must have sufficient strength; splitting it into three prompts does not itself add security. A successfully used command is invalidated and replaced with a new one for the user to save.

**Optional citizen email:** the robot offers an email address with themed wording such as "Official citizen ID — email address" for the Earthan Intergalactic Empire (working fictional name). It explains the recovery benefit and provides a clear skip action. Email remains optional; exercise review and ordinary account use do not require it. The email must be verified before becoming a recovery route. A previously registered, verified email can receive a recovery code when the user loses their ID, password, or saved recovery command. Merely supplying an email address, or registering a new one after losing access, does not prove ownership of the old account. Email delivery is framed as contacting the Empire without requiring a human support team.

Both recovery methods lead to a private new-password-and-confirmation prompt, followed by ordinary sign-in and supportive robot dialogue. Emailed codes are single-use and time-limited, with controls against repeated guessing. Passwords, recovery commands, and codes stay outside AI dialogue, audio, journals, and exercise analysis. These requirements follow [OWASP's password-recovery guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

**Approved full restoration:** successful recovery through either the generated command or a code sent to the previously verified email, followed by sign-in, restores the full existing journal and saved progress. This includes pre-recovery videos, photos, and feedback that the user has retained. Email supplies an optional backup route; skipping it does not restrict journal access after valid command recovery. Recovery does not recreate records the user has deleted.

If both the command and access to a previously verified email are lost, there is no recovery through these routes. The robot must explain this before the user skips email and must not restore private data on an unverified request. A saved recovery kit should include the authorized ID so forgetting that ID alone does not require guesswork. The proposed account-identification experience appears under Proposed Defaults for Review.

Recovery acceptance criteria:
- Setup provides a generated recovery command with a way to save it privately; no actual secrets appear in planning documents.
- Three themed recovery responses accept equivalent capitalization and require the complete correct command.
- The optional citizen-email prompt names email clearly, explains its benefits, and allows skipping.
- An unverified or newly supplied address cannot recover someone else's account.
- A valid command or a valid code sent to an established verified email permits password replacement; invalid proof does not.
- Used commands and email codes cannot be reused; email codes also expire.
- Setup explains the consequences of losing all available recovery proofs.
- Either successful recovery route, followed by sign-in, restores all retained journal entries and saved progress, including entries from before recovery.

Acceptance criteria:
- The returning-user scene includes the agreed code-ID and masked-password interaction.
- First-time setup lets the user choose an available code ID and establish a password through private fields.
- The robot's story connects initial registration to future sign-in, without adding combat mechanics.
- Successful authentication grants access to that user's records and progress.
- An unverified visitor cannot inspect another person's private records.
- Passwords are kept out of robot conversation content, journal entries, video analysis, and spoken dialogue.

Source: `scope.md > Accounts, Journal, and Library`.

### Exercise Journal and Reference Library

The in-game journal groups activities by day. Each entry lets the user access their exercise video and its associated feedback. Technique-progress comparisons use these records, subject to validated analysis. Saved journal content is personal and requires the user's authenticated access.

The reference library provides demonstrations of the supported exercises, with attribution and supporting sources. It also supports the reference comparison in the holographic review.

Acceptance criteria:
- A saved day entry identifies its exercise and provides the associated video and feedback.
- The user can revisit previous entries after returning and signing in.
- Journal content is restricted to its owner.
- Library demonstrations are clearly identified as reference media, separate from personal exercise records.

#### Journal Master Control

The journal contains a "Master Control" section for settings and selective record deletion. After the first completed exercise-video-and-feedback mission, the robot introduces this control as the experience progresses. Product clarification for review: this tutorial explains an existing control rather than locking deletion behind mission completion. Records continue to be saved and updated as the user practices; there is no user-facing automatic age-based expiry in the requested experience. They remain available until the user chooses to delete them. The user can choose a specific feedback item, photo, or video for deletion without clearing unrelated records. This is a personal-account control, not access to other users' data.

Product clarification for review: identify the selected item and explain what deletion removes before a confirmation action. Cancelling preserves it. Once deletion succeeds, remove the selected item from the journal and stop using that deleted item for future analysis or comparisons. If a retained feedback item refers to a deleted video, show that the source video is unavailable instead of a broken player; retaining that feedback does not preserve access to the deleted media. Failure shows a clear message and permits retry without falsely claiming success. Storage cleanup, backup handling, and related derived-data deletion must be specified in 4-spec; simply hiding an item is not deletion.

Master Control acceptance criteria:
- The journal provides a clearly named Master Control section.
- The user can select and delete an individual feedback item, photo, or video from their own records.
- Unrelated saved items remain available after selective deletion.
- A cancelled deletion leaves the selected item available; successful deletion removes it from normal access and future use.
- A retained entry whose source media was deleted communicates that the media is unavailable.
- New practice records continue to be added while older retained records remain accessible.
- Settings are accessible from Master Control; the exact adjustable settings remain to finalize during review.

An empty journal explains that no completed reviews have been recorded yet and invites the first exercise. Exact settings are proposed below. Retention and the user-facing selective deletion location are established.

Source: `scope.md > Accounts, Journal, and Library`.

## States and Boundaries

- **Entry:** cinematic introduction followed by a holographic new-user/returning-user choice.
- **New-user arrival:** short movement guidance, route to park, and robot setup including account creation.
- **Returning-user entry:** direct robot-led sign-in, bypassing new-user movement and setup.
- **Choosing an exercise:** RPG dialogue choices and a path to the selected station.
- **Awaiting a video:** paused exercise scene, continued audio, capture guidance, and uploader.
- **Analyzing:** visible processing state and honestly labeled visualization.
- **Results:** frame-linked observations, comparison, evidence, and uncertainty.
- **Insufficient recording evidence:** give direct, non-witty recapture guidance, request a replacement video, and permit cancellation; award no completion or credits.
- **Unavailable station:** clearly communicate that the exercise is not currently supported.
- **Missing or declined reference photos:** explain that photos are optional and permit the user to skip and continue to exercise-video review.
- **Exit before feedback:** return near the station with situational encouragement; award no completed-review mission or credits.
- **Reviewed, awaiting station exit:** usable feedback has been viewed, but daily completion and rewards remain pending until the qualifying exit.
- **Completed station exit:** after a usable review and its feedback/demonstration sequence, return to the park and commit daily completion and credits. The first qualifying exit triggers mission notification, task access, and the Master Control introduction.
- **Returning browser:** enter the robot-led authentication experience; do not expose private records before verification.
- **Signed-in return:** restore personal records and progress; the proposed return point is the park near the robot.
- **Processing failure:** plain failure message, retry, or non-rewarding cancellation.
- **Failed sign-in/account recovery:** remain unauthenticated, show a themed but understandable error, and permit retry or return to the entry choice without exposing private records.
- **Empty journal:** explain that there are no completed review entries and invite the first exercise.

The game presentation and analysis must serve the useful exercise-feedback journey. Educational observations do not guarantee safe or medically appropriate exercise or replace professional assessment.

## Product Decisions

- Preserve the full space-game experience beyond the original hackathon time budget; the learner considers it integral to the product.
- Keep exploration controls simple: WASD and mouse look, an optional jump, and a corner map. The terrain conceals the destination at first; no prescribed obstacle course.
- Use a robot and RPG-style interaction for setup and exercise choice.
- Guide exercise selection with floor arrows or a direction marker.
- Pause the station animation and display an approximately three-fifths-width holographic review panel. Use voiced character dialogue, silence or very sparse low music for instructions/controls, and digital processing sounds during analysis.
- Show user/reference comparison and frame-specific explanations instead of only a general text verdict.
- Retain pull-ups, push-ups, and squats as the three supported exercises; extra stations can be visible but unavailable.
- Offer four or five personal-reference photos as an optional step, respecting the user's choice to skip and continue. Their effect on accuracy still needs validation.
- Distinguish abandoning a review from completing one, with different robot responses and progression outcomes.
- Include an avatar representation of the recorded movement followed by a demonstration of the suggested adjustment, subject to fidelity and analysis validation.
- Include first-review celebration, a top-of-screen task icon, daily missions, and multi-day milestones. These are now requested features rather than deferred gamification.
- Commit daily completion and Energy Credits only after the video has produced usable analysis, the feedback interaction is finished, and the user exits the station. A pending review or unusable recording cannot grant rewards. Permit non-rewarding cancellation with situational robot dialogue and plain re-upload guidance when analysis cannot assess a clip.
- Reset the current five-day streak after an unprotected missed day. Earn regular Energy Credits through the first five weekly activity tasks: 5, 5, 5, 2.5, and 2.5; no regular credits are awarded for later activity days that week. Seven actual activity days without regular-credit protection spending separately earn 2.5 reserve credits. Four qualifying seven-day weeks accumulate 10 reserve credits if unspent. Unused regular credits reset to zero weekly; saved reserve carries forward up to 100. Protection costs 10 per missed day with a maximum of three protected days per week. Earlier free allowances, five-day reserve rewards, and the 40-credit cap are superseded.
- Use the fictional backstory that workouts generate energy to run the park and robot, and saved energy sustains them on protected missed days.
- Introduce Master Control through the robot after the first completed exercise-video-and-feedback mission.
- Include a private day-organized journal containing submitted exercise videos and feedback, plus comparison across practice sessions. Its Master Control section provides settings and selective feedback/photo/video deletion; records remain saved as new ones are added until the user deletes them.
- Include robot-led returning-user sign-in using a code ID and password, plus an approved generated recovery command entered through three case-insensitive themed prompts.
- Offer optional verified email as an "Official citizen ID" backup recovery route with a single-use emailed code. Both successful recovery routes restore the full retained journal and saved progress.
- Offer new/returning-user choices after the opening cutscene. New users create their own ID and password in the robot's initial setup conversation; returning users go straight to robot-led sign-in. The authorization/war-zone story supplies atmosphere, not combat gameplay.
- Include a reference library for supported exercises.
- Include optional later-photo comparison for transformation milestones; define the evidence needed for any claimed improvement.
- Keep credit-based exercise unlocks, paid access to new zones, and real-money credit purchases in the future business roadmap, alongside the dietary zone.
- Review planning in Markdown. No PRD HTML companion has been requested.

## What We're Building

The complete arrival, park, robot, setup, three exercise-station flows, holographic video submission, analysis display, reference comparison, frame-specific feedback, post-review avatar demonstration, missions/milestones, robot-led account access, personal journal, and reference library described above. This includes optional transformation-photo comparison. Feasibility and implementation sequencing will be established in 4-spec after the product decisions are resolved.

## Deferred Features

- Phone support and a mobile or connected phone-recording experience.
- Mini-games and functional support for additional exercises.
- Meal plans and comprehensive workout-plan generation.
- Credit-based unlocks for additional exercises. Earned Energy Credits could later purchase access to more exercise content; the current supported set remains pull-ups, push-ups, and squats.
- Paid access to new areas, including a dietary zone. The learner proposes purchasing an area directly or buying more credits with real money to obtain access. Direct payment and purchased credits are future options, not implemented payment requirements.

### Future Credit Unlocks and Purchases

The learner wants saved effort to have uses beyond streak protection: credits could unlock other exercises. New areas could be purchased directly or through credits bought with money. The exact available areas, exercise unlock costs, credit prices, which balance funds purchases, and how purchased credits interact with weekly expiry and the 100-credit reserve cap are not settled. The learner's three-exercise free-tier idea remains the starting business direction. Billing, checkout, subscriptions, and paywall behavior are deferred; this roadmap does not change the current earned-credit rules or grant free credits.

Virtual dumbbell pickup is an expressed exploration idea. A limited inspect-and-put-down interaction is proposed below; a larger object-interaction system is not defined.

## Non-Goals

- Combat mechanics or reproducing assets from the referenced games.
- Guaranteed exercise safety, medical diagnosis, or professional-assessment replacement.
- Unsubstantiated accuracy claims or simulated findings presented as real analysis.
- Presenting photo differences or participation counts as proven fitness or health improvement without an appropriate, supported criterion.

## Proposed Defaults for Review

These originated as assistant proposals to complete routine details and were adopted with the product review on 2026-10-07. The heading is retained for traceability. They may be revised by the learner as technical planning exposes concrete tradeoffs.

| Detail | Proposed behavior |
| --- | --- |
| Setup context | Keep preferred name, age, and credentials in setup; optionally ask exercise experience and any user-described movement limitations relevant to feedback. Do not infer them from appearance or require a detailed medical history. |
| Review layout | Capture/upload first, then analysis status. Results show the user's video and reference side by side, with a selectable list of frame-linked findings underneath. Selecting a finding seeks to its video moment and shows evidence and uncertainty. Bottom controls provide replacement upload, cancellation, and completion exit. |
| Finish review | After a usable review has been viewed, enable "Finish review and return to park." This completes the station's feedback/demonstration sequence and commits its single daily completion on returning to the park. "Leave without finishing" remains a separate non-rewarding action. |
| Return scene and controls | After sign-in, resume near the robot in the park. Enable WASD, mouse look, Space, and E after onboarding. During dialogue or panels, pause avatar movement and release the mouse for ordinary controls; return movement control on closing them. |
| Master Control settings | Provide sound/music volume, reduced-motion or skip-cutscene preferences, preferred name, optional reference-photo management, and account/recovery settings. Credentials use private authentication controls. Skipping cinematic presentation does not skip the video-analysis and feedback requirements for rewards. |
| Calendar | Use the account's chosen local timezone. A day runs midnight to midnight; the weekly task period runs Monday through Sunday. One qualifying station completion per day advances participation, even if the user completes more reviews. |
| Protection | On return, the robot shows missed days and offers a manual 10-credit protection for each. Display current balances, use regular credits first, and ask before spending saved reserve. Use the current available balance; expired regular credits cannot fund past gaps. Apply the three-protections limit to the week containing each missed day. An unprotected gap resets the current streak; protection never awards activity-day credits or restores seven-day reserve eligibility. |
| Forgot authorized ID | Save the authorized ID with the recovery command in the private recovery kit. A previously verified email can identify the account and restore its ID after code verification. Recovery proof is checked before exposing identifying details or records. |
| Initial struggle and objects | Show the initial exercise struggle between the park reveal and robot greeting. A virtual dumbbell can be picked up, inspected, and put down as an atmospheric interaction; it does not analyze a new exercise or award activity credits. |
| Progress evidence | Compare the same exercise across usable, sufficiently comparable clips. Link each reported change to earlier and later moments. Award an improvement milestone only when a validated criterion supports it; otherwise show that comparison is inconclusive. Photo comparisons support reflection without automatically proving health or fitness improvement. |

## Open Questions

The core journey, cancellation/retry behavior, completion trigger, account recovery, journal controls, credit earning, reserve eligibility, caps, and routine defaults are approved. Final branding can be chosen later.

The music interpretation in sound-design.md is approved as the working direction. The full emotional sequence and named soundtrack references are captured; exact excerpts and voice character can be refined through an audible prototype in 4-spec. The written plan is not evidence of completed audio production.

To investigate in 4-spec:
- Purposeful reference-photo capture and whether it measurably improves analysis.
- Exercise-specific filming instructions, reference demonstrations, comparison accuracy, and uncertainty handling.
- Video submission constraints and reference-media availability.
- Feasibility of the full visual experience, including assets, animation, sound, and the analysis visualization.
- Fidelity of reconstructing captured movement on the avatar and illustrating supported adjustments without overstating the underlying analysis.
- Comparable, defensible measures of technique progress, reference-photo usefulness, and any supported transformation observations.

The working project name can remain until the learner chooses a final name.
