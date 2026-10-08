import { useEffect, useState } from 'react';

const STEPS = [
  { key: 'tour-review', number: '01', title: 'Let’s work on something real.', line: 'Pick a station, bring me a short video, then press Analyze movement. I’ll show you the moments I can actually measure. If I lose sight of you, we’ll try a better angle.', detail: 'Pull-ups · Push-ups · Squats', icon: '◉' },
  { key: 'tour-missions', number: '02', title: 'One useful review at a time.', line: 'Your first mission is simple: review a clip and return to the park. That last step logs the session. Just selecting a file doesn’t count.', detail: 'Record → Analyze → Read the evidence → Finish & return', icon: '◇' },
  { key: 'tour-energy', number: '03', title: 'You bring the energy.', line: 'In our little story, your practice keeps this outpost running. Your first three activity days each earn five Energy Credits; the next two earn two and a half. Ten credits protect a missed day.', detail: '5 + 5 + 5 + 2.5 + 2.5 = 20 per week', icon: 'ϟ' },
  { key: 'tour-settings', number: '04', title: 'Make the place feel like yours.', line: 'Too much music? Open Settings. You can adjust voices, sound and movement. Missions explains the credit rules; your Journal keeps this visit’s reviews. You can delete a recording there whenever you want.', detail: 'Guest expedition · clips stay on this computer · this visit clears on reload', icon: '☷' },
];
export default function RobotTour({ onDone, onSpeak }: { onDone: () => void; onSpeak: (key: string) => void }) {
  const [step, setStep] = useState(0);
  const active = STEPS[step];
  useEffect(() => { onSpeak(active.key); }, [active.key, onSpeak]);
  return <section className="robot-tour" aria-label="ORBIT orientation">
    <div className="tour-progress" aria-label={`Introduction ${step + 1} of ${STEPS.length}`}>{STEPS.map((item, index) => <span key={item.key} className={index <= step ? 'complete' : ''} />)}</div>
    <div className="tour-emblem" aria-hidden="true">{active.icon}</div>
    <p className="eyebrow">ORIENTATION / {active.number} OF 04</p>
    <h3>{active.title}</h3><p className="dialogue-line">“{active.line}”</p>
    <p className="tour-detail">{active.detail}</p>
    <div className="tour-actions"><button className="text-button" onClick={() => step > 0 ? setStep(step - 1) : onDone()}>{step > 0 ? 'Back' : 'I’ll explore on my own'}</button><button className="primary" onClick={() => step === STEPS.length - 1 ? onDone() : setStep(step + 1)}>{step === STEPS.length - 1 ? 'Choose my first station' : 'Got it. Keep going.'} ↗</button></div>
  </section>;
}
