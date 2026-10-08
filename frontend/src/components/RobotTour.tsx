import { useEffect, useState } from 'react';
import dialogue from '../game/dialogue.json';

const STEPS = [
  { key: 'tour-review', number: '01', title: 'Let’s work on something real.', detail: 'Pull-ups · Push-ups · Squats / Useful observations, visible limits, and timestamps to explore.', icon: '◉' },
  { key: 'tour-missions', number: '02', title: 'One useful review at a time.', detail: 'Record → Analyze → Read the evidence → Finish & return', icon: '◇' },
  { key: 'tour-energy', number: '03', title: 'You bring the energy.', detail: '5 + 5 + 5 + 2.5 + 2.5 = 20 / 10 credits protect one missed day', icon: 'ϟ' },
  { key: 'tour-play', number: '04', title: 'A little room to play.', detail: 'Signal response · Echo sequence · Orbital alignment / Walk to a console or open Play.', icon: '✧' },
  { key: 'tour-settings', number: '05', title: 'Make the place feel like yours.', detail: 'Guest expedition · clips stay on this computer · this visit clears on reload', icon: '☷' },
] as const;
export default function RobotTour({ onDone, onSpeak }: { onDone: () => void; onSpeak: (key: string) => void }) {
  const [step, setStep] = useState(0);
  const active = STEPS[step];
  useEffect(() => { onSpeak(active.key); }, [active.key, onSpeak]);
  return <section className="robot-tour" aria-label="ORBIT orientation">
    <div className="tour-progress" aria-label={`Introduction ${step + 1} of ${STEPS.length}`}>{STEPS.map((item, index) => <span key={item.key} className={index <= step ? 'complete' : ''} />)}</div>
    <div className="tour-heading"><div className="tour-emblem" aria-hidden="true">{active.icon}</div><p className="eyebrow">ORBIT / GETTING YOUR BEARINGS<br /><span>ORIENTATION {active.number} OF 05</span></p></div>
    <h3>{active.title}</h3><p className="dialogue-line">“{dialogue[active.key].text}”</p>
    <p className="tour-detail">{active.detail}</p>
    <div className="tour-actions"><button className="text-button" onClick={() => step > 0 ? setStep(step - 1) : onDone()}>{step > 0 ? 'Back' : 'I’ll explore on my own'}</button><button className="primary" onClick={() => step === STEPS.length - 1 ? onDone() : setStep(step + 1)}>{step === STEPS.length - 1 ? 'Choose my first station' : 'Got it. Keep going.'} ↗</button></div>
  </section>;
}
