import { useEffect, useRef, type ReactNode } from 'react';

export default function Panel({ title, eyebrow, children, onClose, wide = false }: {
  title: string; eyebrow: string; children: ReactNode; onClose: () => void; wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return <dialog ref={ref} className={`hologram ${wide ? 'wide' : ''}`} aria-labelledby="panel-title"
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="panel-header">
      <div><p className="eyebrow">{eyebrow}</p><h2 id="panel-title">{title}</h2></div>
      <button className="close-button" onClick={onClose} aria-label="Close panel">×</button>
    </header>
    {children}
    <div className="panel-code" aria-hidden="true"><span>OUTPOST 07 / SECURE INTERFACE</span><span>◈</span></div>
  </dialog>;
}
