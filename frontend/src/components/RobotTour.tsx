import { useEffect, useState } from 'react';
import dialogue from '../game/dialogue.json';

const STEPS = [
  { key: 'tour-review', number: '01', title: 'Bring a clip. We’ll take a look.', detail: 'Pull-ups · Push-ups · Squats / Listen first. Open the notes whenever you need them.', icon: '◉' },
  { key: 'tour-missions', number: '02', title: 'One set at a time.', detail: 'Upload → Check → Listen or read → Finish & return', icon: '◇' },
  { key: 'tour-energy', number: '03', title: 'You bring the energy.', detail: '5 + 5 + 5 + 2.5 + 2.5 = 20 / 10 credits protect one missed day', icon: 'ϟ' },
  { key: 'tour-play', number: '04', title: 'A little room to play.', detail: 'Signal response · Echo sequence · Orbital alignment / Walk to a console or open Play.', icon: '✧' },
  { key: 'tour-settings', number: '05', title: 'Make the place feel like yours.', detail: 'Guest expedition · clips stay on this computer · this visit clears on reload', icon: '☷' },
] as const;
export default function RobotTour({ onDone, onSpeak, persistent = false }: { onDone: () => void; onSpeak: (key: string) => void; persistent?: boolean }) {
  const [step, setStep] = useState(0);
  const active = STEPS[step];
  useEffect(() => { onSpeak(active.key); }, [active.key, onSpeak]);
  return <section className="robot-tour" aria-label="ORBIT orientation">
    <div className="tour-progress" aria-label={`Introduction ${step + 1} of ${STEPS.length}`}>{STEPS.map((item, index) => <span key={item.key} className={index <= step ? 'complete' : ''} />)}</div>
    <div className="tour-heading"><div className="tour-emblem" aria-hidden="true">{active.icon}</div><p className="eyebrow">ORBIT / GETTING YOUR BEARINGS<br /><span>ORIENTATION {active.number} OF 05</span></p></div>
    <h3>{active.title}</h3><p className="dialogue-line">“{dialogue[active.key].text}”</p>
    <p className="tour-detail">{persistent && step === 4 ? 'Private account · notes and progress return after sign-in · recording uploads are optional' : active.detail}</p>
    <div className="tour-actions"><button className="text-button" onClick={() => step > 0 ? setStep(step - 1) : onDone()}>{step > 0 ? 'Back' : 'I’ll explore on my own'}</button><button className="primary" onClick={() => step === STEPS.length - 1 ? onDone() : setStep(step + 1)}>{step === STEPS.length - 1 ? 'Choose my first station' : 'Got it. Keep going.'} ↗</button></div>
  </section>;
}
