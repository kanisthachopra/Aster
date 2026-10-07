---
doc: scope
status: approved
---

# Exercise Form Feedback

A first-person space game that guides a solo exerciser through a cinematic arrival, an exercise park, an encounter with an AI robot, personal-context onboarding, and video-based feedback for pull-ups, push-ups, and squats. This is a descriptive working title; a final name is undecided.

## Revised Project Direction

On 2026-10-03, the learner explicitly expanded the project beyond the original hackathon proof of concept: "I want the entire thing" and "we can build something greater than just for this project." Preserve the full guided game experience below as the agreed scope direction. The original 2–4-hour curriculum target no longer describes the effort for this expanded project. Product behavior, feasibility, and implementation sequencing remain to be defined; the expanded direction does not establish a delivery estimate.

## The Unique Kernel

A guided first-person adventure makes exercise feedback part of the world and story. A robot encountered in a space exercise park helps the player understand their own real-world practice. Feedback remains inspectable: explain what is visible in their clip, identify what cannot be judged, and connect suggestions to relevant, traceable sources.

## Who It's For

The first release runs in a computer web browser with keyboard and mouse. Phone support is explicitly future work. A minimal game-style title screen has a left-side menu over a silent representative still or subtly animated image; selecting Start activates audio and begins the opening cinematic. There is no marketing landing page.

Someone starting to exercise independently, like the learner, who watches tutorials but remains unsure how their own pull-ups, push-ups, or squats compare. They may have no experienced person available to give dependable feedback.

## The Core Loop

Enter directly into a first-person scene on another planet or moon. The protagonist checks their arms and suit in near-silence, with prominent breathing and minute sounds. As they realize they are in a new world, a grand sci-fi theme grows into a crescendo at the end of the opening cutscene and holds during the new/returning-user choice. Selecting a branch leads to a mellower background variation sharing the same musical texture. During the new-user route, the protagonist runs, looks across the landscape and stars, and jumps while that music develops. The learner imagines a partly transparent space suit with the character's arms and physique visible.

Arrive at a space exercise park with a pull-up bar, a push-up area, and a squat area with weights. The protagonist attempts an exercise, struggles, and lacks someone to guide them. A robot enters and starts a conversation framed as an interaction within the game.

Park arrival has a milestone/goal cue inspired by the feeling of God of War's achievement sounds. The robot's awakening includes startup and electrical/mechanical whirring sounds. Robot greeting and onboarding use a mellower, more positive variation of the theme, possibly major-leaning. The learner is continuing to define station and later sounds in 3-prd; no specific instruments or existing tracks are selected.

Voiced avatar and robot dialogue recurs between gameplay moments to give the characters personality. The station mini-cutscene includes avatar speech over low, mellow music. Holographic instructions, decisions, Master Control, and video upload transition into silence or very sparse low music: individual notes or short three-to-four-note phrases separated by substantial rests. Analysis uses digital clicks or possible typing-like sounds to suggest an active futuristic computer. On completion of analysis, the robot speaks feedback in short segments with corresponding visible text. After the qualifying station exit, a milestone cue and mission notification draw attention to the mission tab while quiet park music continues. Missions, journal, and settings use mostly silence or very low music with rests and occasional robot interaction. Exact musical references and voice character remain to refine in 3-prd.

The robot asks for personal context and preferences, then offers an optional personal-reference photo step before exercise-video feedback. The learner envisions four or five photos in different positions, with the intended benefit of giving the robot a visual reference for their body and proportions so it makes fewer incorrect corrections or falsely confident judgments. The learner explicitly allows skipping the photos, including for privacy reasons, while still receiving exercise-video review. Whether that photo sequence improves analysis accuracy is an unvalidated hypothesis; do not claim an accuracy benefit or penalty for skipping without evidence. Exactly which poses, what user-entered context is needed, and how uncertainty is handled remain PRD decisions. No reliable capability to infer personality or demographics from appearance has been established.

Choose pull-ups, push-ups, or squats; record and submit a short clip of that exercise; and receive observations, uncertainties, and supported suggestions through the guided experience. If the clip is insufficient, understand what needs to be captured and submit another recording. Each review covers one exercise.

The reason to return is to understand their own practice and work toward improvement, supported by daily missions and multi-day milestones. The learner defines qualifying participation as submitting a video, receiving usable analysis, viewing and finishing feedback, then exiting the station. Daily completion and credits update only on that qualifying exit, not while the review remains open. An unusable recording cannot complete the task. They also want technique comparisons across saved workouts and optional later-photo comparisons for transformation milestones. Participation, supported improvement, and visual photo change must be distinguished; exact milestone criteria remain product decisions.

## Inspiration & Identity

The learner admires [Duolingo](https://www.duolingo.com/) for its playful appearance, memorable characters, and ability to encourage daily practice. They also noticed that streak maintenance can overshadow meaningful learning.

The learner has now supplied a specific visual direction: an immersive first-person space-game experience with cinematic pacing, music, breathing, a visible protagonist body, exercise stations, and a robot guide. They reference the first-person presentation of PUBG, Free Fire, and Call of Duty, with a space exercise setting rather than a combat scenario. Their references are presentation inspiration, not a request to copy those games' assets or add combat.

The first arrival should enter the scene directly, without an introductory marketing page. Onboarding and feedback should feel integrated into the guided game. Fine-grained controls, typography, palette, and interface placement remain for the PRD.

### Soundtrack References

The learner identifies The Martian as the closest overall musical reference and also names Interstellar, The Lord of the Rings, Batman Begins, After the Dark (The Philosophers), Inception, American Beauty, Letters from Iwo Jima's "Main Titles," Narnia's "Only the Beginning of the Adventure," and Casper's "One Last Wish." Their scene placements and a proposed coherent musical interpretation are recorded in devpost/sound-design.md and the PRD. This is a reference direction, not a selected soundtrack asset library or an auditioned score.

## Why This Matters to the Learner

When exercising alone, they feel they are "shooting in the dark." Their questions include shoulder positioning and how their lowering and pulling sequence should change. They want to turn an idea into a coherent UI/UX and finish an experience someone can actually use.

## Game Interaction Direction

The learner wants an immersive game with simple controls. Hands-on feedback on 2026-10-07 replaces the W-only pathway and obstacles with WASD/mouse exploration of a wider natural landscape. Terrain conceals the habitat initially; an expandable corner map supports discovery. Hands should have recognizable human anatomy, creatures should move through the environment, and terrain, stars and planets need greater detail.

The expanded park is inside a dome that conceals its interior from outside while allowing outward views from inside. Entry transitions from third-person to first-person, powers the park lights and reveals the sky. Future sectors stay dark and inaccessible. A dormant robot starts in a corner service bay, activates with mechanical sound and light, approaches the player and begins personal setup. Avatar and robot speech accompany the sequence.

After onboarding, the park can be explored. Pull-up, push-up, and squat areas are usable; visible stations for other exercises such as dips and L-sits are unavailable until future support is added. The learner also imagines picking up virtual dumbbells; the exact interaction remains to be defined. Mini-games are explicitly future work. Post-onboarding movement controls and how exercise stations launch recording and feedback are unresolved.

## Review Exit and Progression

Leaving before finishing returns the player near the station without activity completion or credits. The robot responds to voluntary cancellation with a brief, situational encouragement to finish. When analysis cannot assess a recording, it instead gives plain re-upload guidance without witty criticism. The user can retry or leave. A successful review followed by station exit is the trigger for activity completion and credits.

After feedback, a cutscene shows the avatar representing the user's captured movement and then demonstrating the suggested adjustment, accompanied by short, human-like avatar dialogue and a robot congratulation. The fidelity of the movement reconstruction must be validated; the demonstration does not establish that the user has already changed their real-world form.

A notification and sound celebrate the first mission, and a task icon appears at the top of the screen. Its task view shows remaining tasks, daily missions, and multi-day milestones. After the first completed exercise-video-and-feedback mission, the robot introduces the journal's Master Control. The learner mentioned five-day, weekly, and ten-day checkpoints, including progress in technique, plus optional photo-comparison milestones after weeks of practice. The player can then continue to another exercise or attempt.

For the five-day streak, an unprotected missed day resets the current count to zero. Regular Energy Credits are earned through weekly activity tasks: Days 1, 2, and 3 each award 5, and Days 4 and 5 each award 2.5, totaling 20. Further activity that week earns no additional regular credits but can qualify for the separate seven-day reserve reward. The learner replaced the free initial/weekly allowances and previous 40-credit cap with this earned system. The story is that exercise generates energy to run the park and robot; this is fictional world-building.

Spend 10 Energy Credits to protect one missed day from resetting the streak, with no more than three protected days per week and only when the available balance permits. Protection is distinct from actually practicing or demonstrating improvement. Earn 2.5 saved reserve credits only for completing actual qualifying activity on all seven days that week without spending regular credits on protection. Five or six activity days and protected missed days do not qualify. Unused regular credits reset to zero each week; existing reserve carries forward intact up to a cap of 100. Four qualifying seven-day weeks (28 activity days) accumulate 10 reserve credits if unspent for one additional protected day. A full reserve funds ten protections in total, subject to the three-per-week limit. The spending interaction, day/week boundaries, and evidence-based improvement criteria remain PRD decisions.

## Accounts, Journal, and Library

After the opening cutscene, a holographic panel offers new-user and returning-user choices. New users proceed through movement guidance and the route to the park. In the robot's first setup conversation, they choose their own code ID and password; the story explains that this restricted/war-zone world requires authorization for future visits. Returning users go directly to robot-led sign-in. This narrative does not add combat gameplay.

Authentication protects access to personal records; merely recognizing a browser is insufficient to disclose them. The learner approved a securely generated recovery command entered through three case-insensitive themed prompts, followed by password replacement and robot dialogue. They also request optional email, framed as an "Official citizen ID" of the Earthan Intergalactic Empire, as a backup recovery-code route. The email must be established and verified before it can recover an account; skipping it permits ordinary app use. Passwords and recovery secrets belong in private authentication fields, not the robot's AI conversation or spoken dialogue.

The learner approved full restoration of the retained journal and saved progress through either successful recovery route. Pre-recovery entries remain accessible after verification and sign-in; email is an optional backup without restricting journal access for users who skip it. Users must understand what happens if all their recovery proofs are lost.

An in-game journal, inspired by the learner's experience of God of War, organizes daily exercise videos and feedback for later access. Its "Master Control" section provides settings and selective deletion of specific feedback items, photos, or videos. Records remain saved and continue updating as new practice records are added until the user chooses to delete them. A reference library contains professional demonstrations of the supported exercises. The learner explicitly requests saved media, records, progress, and comparison across sessions; exact settings remain a PRD detail.

The learner's future business direction is a free tier with three exercises, credit-based unlocks for additional exercises, and later zones such as dietary support. They propose buying access to new areas directly or purchasing more Energy Credits with real money. Credit pricing, unlock costs, eligible balances, and purchased-credit expiry/caps remain undefined. Payments, credit purchases, additional exercise support, and extra zones remain future work; the current earned-credit rules are unchanged.

## Evidence to Investigate

The learner's photo-personalization idea needs validation during technical planning. [OpenCap's published movement-analysis study](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1011462) uses a neutral-pose recording to scale a person-specific body model and discusses the importance of camera placement and body visibility. This supports investigating a purposeful calibration step; it does not establish an accuracy benefit from this app's proposed four-to-five-photo sequence or validate this app's pull-up, push-up, and squat feedback. No analysis system has been selected.

## What "Working" Looks Like

The user experiences the cinematic space arrival, reaches the exercise park, encounters the robot, completes the agreed context-gathering interaction, and submits a real clip for one of the three supported exercises. They receive understandable feedback within that experience: possible visible issues, uncertainty, and exercise-relevant suggestions backed by source links. When more information is needed, the robot explains how another recording could help.

The completed product must deliver both the game presentation and the useful feedback journey. Verify the analysis with representative clips for pull-ups, push-ups, and squats. Showing the experience working and validating the accuracy of the analysis are separate requirements.

If submitted to the original hackathon, the short demo video and public GitHub repository requirements still apply; deployment is optional. The expanded product is no longer constrained to the original proof-of-concept time budget.

## The Product Boundary

- The full first-person space-game arrival and transition: visible arms and suit, running, looking around, jumping, a star-filled environment, a musical crescendo, and breathing audio.
- The exercise park with three corresponding stations and the protagonist's initial struggle followed by the robot encounter.
- Guided, game-integrated personal-context and preference onboarding, including the proposed optional four-to-five-photo personal-reference step. Users can skip photos and continue to video review. Its exact capture requirements, usefulness, and limits need validation before claiming an accuracy effect.
- Exactly three exercises: pull-ups, push-ups, and squats, with one exercise and one short clip submitted for each review.
- Observations about visible movement, possible issues, and explicit uncertainty.
- Requests for a better recording or missing information when needed.
- Suggested adjustments connected to relevant, traceable supporting references. Source selection and verification will be defined in the next planning stages.
- A complete, usable upload-to-result experience. Recording adds friction, so guidance on capturing a useful clip matters.
- Distinct early-exit and completed-review outcomes, plus an avatar demonstration of captured movement and suggested adjustments.
- First-mission celebration, a top-of-screen task view, daily missions, and multi-day milestones.
- Robot-led returning-user sign-in, a private day-organized journal of videos and feedback, and a reference demonstration library.
- Progress comparisons across exercise sessions and optional later-photo comparisons; claimed improvements require supportable evidence.

Player controls, cinematic progression, robot interaction, the onboarding inputs, feedback presentation, returning-player behavior, and consequential failure states must be resolved in the PRD. Technical feasibility, game assets, audio, video handling, and analysis limitations must then be addressed in the technical plan. Supporting three exercises adds exercise-specific recording guidance, references, and validation work.

## Later

- Exercises beyond pull-ups, push-ups, and squats.
- Meal planning around dietary preferences and available food.
- Full workout-plan generation; personal-context onboarding itself is now included in the expanded direction.
- Paid access to additional exercises and zones, including dietary support; the current supported set remains pull-ups, push-ups, and squats.
- Mini-games and support for the additional exercise stations visible in the park.

## Explicitly Cut

- A comprehensive nutrition and workout-plan generator has not been added to the expanded game brief. Meal planning remains deferred until requested as a concrete workflow.
- Promises of safe or medically appropriate exercise, diagnosis, or replacement of professional assessment: this prototype provides educational feedback with stated limits.

The learner approved the original three-exercise scope on 2026-10-02, explicitly authorized the full game direction on 2026-10-03, and approved the PRD and working sound direction on 2026-10-07. Technical planning is now in progress in 4-spec, with computer-only delivery established for the first release. The existing scope.html shows the earlier scope and is marked as superseded; this Markdown document is canonical.
