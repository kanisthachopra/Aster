import type { AnalysisReport, Finding } from './types';

export interface CoachingMoment {
  id: string;
  title: string;
  timestamp: number;
  observation: string;
  cue: string;
  spokenText: string;
}
export interface CoachingReview {
  title: string;
  summary: string;
  moments: CoachingMoment[];
  uncertainty: string;
  spokenText: string;
}

const notes = (report: AnalysisReport) => (report.captureNotes ?? []).join(' ');
const trackingChanged = (report: AnalysisReport) => /shifts abruptly|change of tracked person/i.test(notes(report));
const stationUnclear = (report: AnalysisReport) => /do not consistently establish the selected exercise|does not consistently match this station/i.test(notes(report) + ' ' + report.summary);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** One specific limitation takes priority over a list of generic disclaimers. */
function captureAdvice(report: AnalysisReport): { uncertainty: string; cue: string } {
  const text = notes(report);
  if (trackingChanged(report)) return {
    uncertainty: 'The dots jump between moments, so I can’t follow a whole rep.',
    cue: 'Keep the camera still and one person clearly in view for the next recording.',
  };
  if (stationUnclear(report)) return {
    uncertainty: 'I’m not sure this is the exercise you picked.',
    cue: 'Check which exercise you picked and see whether the dots line up with your body.',
  };
  if (/shoulders are missing|shoulder.*obscured/i.test(text)) return {
    uncertainty: 'Your shoulders go out of view or get hidden during part of the movement.',
    cue: 'Move the camera back or tilt it up a little to keep your shoulders visible.',
  };
  if (/wrists or hands.*out of view/i.test(text)) return {
    uncertainty: 'Your hands go out of view or get hidden in part of the clip.',
    cue: report.exercise === 'pullup' ? 'Include your hands and the bar in the next clip.' : 'Leave enough space in the picture for your hands throughout the movement.',
  };
  if (/hip is difficult to locate/i.test(text)) return {
    uncertainty: 'I can’t see your hips clearly through this clip.',
    cue: 'Leave more space around your body and avoid a bright light behind you.',
  };
  if (/feet or ankles.*hidden|ankles are outside or obscured/i.test(text)) return {
    uncertainty: report.exercise === 'squat' ? 'Your feet are hidden in part of this view.' : 'I can’t see enough of your legs to comment on how they move.',
    cue: report.exercise === 'squat' ? 'Include your feet and the floor in the next recording.' : 'Use a wider view if you want feedback on your legs too.',
  };
  if (/tracking drops out/i.test(text)) return {
    uncertainty: 'I lose sight of your movement during part of the clip.',
    cue: 'Keep yourself in the picture and check that the lighting stays clear.',
  };
  if (/frontal or oblique/i.test(text)) return {
    uncertainty: 'This camera angle hides some of the movement toward or away from the camera.',
    cue: 'Keep a similar camera position when comparing your next clip.',
  };
  if (/head is often cropped/i.test(text)) return {
    uncertainty: 'Your head is out of view, so I can’t comment on its position.',
    cue: 'You can keep this view for the rest of your body, or widen it to include your head.',
  };
  if (report.status === 'insufficient') return {
    uncertainty: 'I can’t see enough of your body clearly to judge this movement.',
    cue: 'Record a short clip with yourself in view and clear lighting.',
  };
  if (report.status === 'partial') return {
    uncertainty: 'I can see these positions, but I can’t follow a whole rep.',
    cue: 'Include the start, the movement, and the return in your next clip.',
  };
  return {
    uncertainty: 'This view can’t tell me for sure that your form is right.',
    cue: 'See whether the dots line up with your body before using the feedback.',
  };
}

const timeLabel = (time: number) => {
  const rounded = Number(time.toFixed(1));
  return `${rounded} ${rounded === 1 ? 'second' : 'seconds'}`;
};
function moment(finding: Finding, title: string, observation: string, cue: string): CoachingMoment {
  return { id: finding.id, timestamp: finding.timestamp, title, observation, cue,
    spokenText: `At ${timeLabel(finding.timestamp)}, ${sentenceFragment(observation)} ${cue}` };
}
const sentenceFragment = (text: string) => /^I\b/.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1);

/** Presentation only. Findings remain linked to their original, measured frame. */
export function getCoachingMoment(report: AnalysisReport, finding: Finding): CoachingMoment | null {
  if (!finite(finding.timestamp) || finding.timestamp < 0 || finding.timestamp > report.duration) return null;
  const advice = captureAdvice(report);
  if (finding.id === 'capture' || finding.id === 'visibility') {
    return moment(finding, finding.id === 'capture' ? 'Clearer view' : 'What I could see',
      advice.uncertainty, advice.cue);
  }
  // Do not turn unknown future finding types, absent joints or mismatched
  // activities into a new movement claim just because their text sounds useful.
  if (stationUnclear(report)) return null;
  const frame = report.frames.find(f => Math.abs(f.timestamp - finding.timestamp) < .001);
  const metrics = frame?.metrics;
  if (!metrics || metrics.orientation === 'incompatible') return null;
  const joint = report.exercise === 'squat' ? 'knee' : 'elbow';
  if (finding.id === 'range' && finite(metrics[joint])) {
    const other = report.findings.find(f => f.id === 'return');
    const otherAngle = other && report.frames.find(f => Math.abs(f.timestamp - other.timestamp) < .001)?.metrics?.[joint];
    const observation = finite(otherAngle) && otherAngle > metrics[joint]
      ? `Your ${joint} is more bent here.` : `I can see your ${joint} position here.`;
    const title = finite(otherAngle) && otherAngle > metrics[joint]
      ? joint === 'knee' ? 'Knee bent' : 'Arm bent'
      : joint === 'knee' ? 'Knee position' : 'Arm position';
    return moment(finding, title, observation,
      'Pause here and see whether the dots line up with your body. Then compare the other moment.');
  }
  if (finding.id === 'return' && finite(metrics[joint])) {
    const range = report.findings.find(f => f.id === 'range');
    const earlier = range && report.frames.find(f => Math.abs(f.timestamp - range.timestamp) < .001)?.metrics?.[joint];
    if (!finite(earlier) || metrics[joint] <= earlier) return null;
    const cue = trackingChanged(report) ? 'Compare these as separate positions. The dots jump, so I can’t follow what happens between them.'
      : report.status !== 'usable' ? 'Compare this with the bent position. I can’t follow a whole rep between them.'
      : report.exercise === 'pullup' ? 'Watch your shoulders move toward the bar, then come back down with control.'
      : report.exercise === 'squat' ? finite(metrics.hip)
        ? 'Watch whether your hips and chest come back up together.'
        : 'Compare how your knee bends and straightens between these two moments.'
      : finite(metrics.hip) ? 'Watch whether your hips and shoulders come back up together.'
        : 'Compare how your elbow bends and straightens between these two moments.';
    return moment(finding, joint === 'knee' ? 'Knee straighter' : 'Arm straighter', `Your ${joint} is straighter here.`, cue);
  }
  if (finding.id === 'body-line' && report.exercise === 'pushup' && finite(metrics.hip)) {
    return moment(finding, 'Body position', 'I can see your shoulder, hip and ankle together here.',
      'Watch whether your hips move with your shoulders. One frame can’t tell me that something is wrong.');
  }
  return null;
}

export function getCoachingReview(report: AnalysisReport): CoachingReview {
  const advice = captureAdvice(report);
  const candidates = report.findings.map(f => getCoachingMoment(report, f)).filter((m): m is CoachingMoment => !!m);
  const movement = candidates.filter(m => m.id !== 'capture' && m.id !== 'visibility');
  // Two movement checkpoints are enough for the first listen. Capture guidance
  // replaces a redundant third checkpoint when this view has a specific limit.
  const capture = candidates.find(m => m.id === 'capture' || m.id === 'visibility');
  const moments = movement.slice(0, 2);
  if (capture && (moments.length < 2 || (report.captureNotes?.length ?? 0) > 0)) moments.push(capture);
  const title = report.status === 'insufficient' ? 'Let’s get a clearer view'
    : report.status === 'partial' ? 'A few moments to work with' : 'One thing to try next';
  const summary = stationUnclear(report) ? 'Check which exercise you picked before using this feedback.'
    : report.status === 'insufficient' ? 'This view is too hard to read for useful feedback yet.'
    : movement.length ? 'Start with these moments, then use one small cue on your next set.'
    : 'There isn’t much I can follow here. A clearer view will help.';
  const spokenMoments = movement.slice(0, 2).map(m => `At ${timeLabel(m.timestamp)}, ${sentenceFragment(m.observation)}`);
  const practicalCue = movement.length ? movement.slice(0, 2).at(-1)!.cue : advice.cue;
  const cameraCue = movement.length && report.captureNotes?.length ? advice.cue : '';
  const openings = {
    pullup: { usable: 'Here’s what I could follow in your pull-up.', partial: 'I caught a few positions in this pull-up clip.' },
    pushup: { usable: 'For your push-up, compare these moments.', partial: 'Parts of this push-up clip are clear enough to look at.' },
    squat: { usable: 'Take a look at these moments in your squat.', partial: 'There are a few squat positions we can look at here.' },
  };
  const opening = stationUnclear(report) ? 'Check which exercise you picked before we go further.'
    : report.status === 'usable' && movement.length ? openings[report.exercise].usable
    : report.status === 'partial' ? openings[report.exercise].partial
    : 'A clearer clip will help me give you something useful to work on.';
  const spokenText = [opening, ...spokenMoments, practicalCue, cameraCue, advice.uncertainty].filter(Boolean).join(' ');
  return { title, summary, moments, uncertainty: advice.uncertainty, spokenText };
}
