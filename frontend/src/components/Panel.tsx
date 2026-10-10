import { useEffect, useId, useRef, type ReactNode } from 'react';
import { pointerInitiated } from './inputModality';

export default function Panel({ title, eyebrow, children, onClose, wide = false, className = '' }: {
  title: string; eyebrow: string; children: ReactNode; onClose: () => void; wide?: boolean; className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // Keyboard-opened interfaces remain immediate; occasional pointer entry gets a brief reveal.
  const pointerEntry = useRef(pointerInitiated());
  useEffect(() => {
    const dialog = ref.current!;
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    dialog.querySelector<HTMLElement>('h2')?.focus();
    return () => {
      dialog.close();
      // React may remove a dialog before the native close algorithm restores its trigger.
      queueMicrotask(() => {
        if (returnFocus?.isConnected && !document.querySelector('dialog[open]')) returnFocus.focus();
      });
    };
  }, []);
  return <dialog ref={ref} className={`hologram ${wide ? 'wide' : ''} ${pointerEntry.current ? 'pointer-entry' : ''} ${className}`} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="panel-header">
      <div><p className="eyebrow">{eyebrow}</p><h2 id={titleId} tabIndex={-1}>{title}</h2></div>
      <button className="close-button" onClick={onClose} aria-label="Close panel">×</button>
    </header>
    {children}
    <div className="panel-code" aria-hidden="true"><span>OUTPOST 07 / SECURE INTERFACE</span><span>◈</span></div>
  </dialog>;
}
