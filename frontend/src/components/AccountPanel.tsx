import { cloneElement, useEffect, useId, useRef, useState, type FormEvent, type ReactElement } from 'react';
import { apiRequest, type AccountProfile, type AccountSession } from '../account/client';
import Panel from './Panel';
import './account.css';

type Mode = 'register' | 'login' | 'manage';
type Screen = Mode | 'recover' | 'email-recovery' | 'kit';
type AuthResult = { profile: AccountProfile; recoveryCommand?: string; journey?: AccountSession['journey'] };
type Props = { mode: Mode; session?: AccountSession; onAuthenticated: (session: AccountSession) => void; onClose: () => void; onLogout: () => void };
const localZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
function zones() {
  try { return [...new Set([localZone(), 'UTC', ...Intl.supportedValuesOf('timeZone')])]; }
  catch { return [localZone(), 'UTC']; }
}
const TIMEZONES = zones();

function Field({ label, children, hint }: { label: string; children: ReactElement<{ 'aria-labelledby'?: string; 'aria-describedby'?: string }>; hint?: string }) {
  const id = useId();
  return <label className="account-field"><span id={id}>{label}</span>{cloneElement(children, { 'aria-labelledby': id, 'aria-describedby': hint ? `${id}-hint` : undefined })}{hint && <small id={`${id}-hint`}>{hint}</small>}</label>;
}
function PasswordField({ value, onChange, label = 'Authorization password', autoComplete = 'new-password', required = true }: {
  value: string; onChange: (value: string) => void; label?: string; autoComplete?: string; required?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  return <div className="account-field"><label htmlFor={id}>{label}</label><div className="account-password">
    <input id={id} type={visible ? 'text' : 'password'} value={value} onChange={event => onChange(event.target.value)} required={required}
      minLength={autoComplete === 'new-password' ? 12 : undefined} maxLength={128} autoComplete={autoComplete} />
    <button type="button" onClick={() => setVisible(!visible)} aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-pressed={visible}>{visible ? 'Hide' : 'Show'}</button>
  </div>{autoComplete === 'new-password' && <small>At least 12 characters. A few unrelated words work well.</small>}</div>;
}

export default function AccountPanel({ mode, session, onAuthenticated, onClose, onLogout }: Props) {
  const [screen, setScreen] = useState<Screen>(mode);
  const [authorizedId, setAuthorizedId] = useState(session?.profile?.authorizedId ?? '');
  const [callsign, setCallsign] = useState(session?.profile?.callsign ?? '');
  const [timezone, setTimezone] = useState(session?.profile?.timezone ?? localZone());
  const [email, setEmail] = useState(session?.profile?.recoveryEmail ?? '');
  const [profile, setProfile] = useState(session?.profile);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [parts, setParts] = useState(['', '', '']);
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [pending, setPending] = useState<AccountSession>();
  const [recoveryCommand, setRecoveryCommand] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [rotateOpen, setRotateOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const active = useRef(true);
  const kitOrigin = useRef<'auth' | 'rotate'>('auth');
  const emailAvailable = session?.emailAvailable === true;
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => { heading.current?.focus(); }, [screen]);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  const move = (next: Screen) => {
    setScreen(next); setError(''); setNotice(''); setPassword(''); setConfirm(''); setCode(''); setCodeSent(false); setParts(['', '', '']);
  };
  const close = () => {
    if (busy) { setError('One moment. Your request is still finishing.'); return; }
    if (screen === 'kit' && !saved) { setError('Save your recovery command and tick the confirmation before leaving this screen.'); return; }
    if (screen === 'kit' && pending) { onAuthenticated(pending); return; }
    onClose();
  };
  const perform = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await work(); }
    catch (reason) { if (active.current) setError(reason instanceof Error ? reason.message : 'That did not go through. Please try again.'); }
    finally { if (active.current) setBusy(false); }
  };
  const newPasswordValid = () => {
    if (password.length < 12) { setError('Use at least 12 characters for your new password.'); return false; }
    if (password !== confirm) { setError('The two passwords do not match yet.'); return false; }
    return true;
  };
  // Profile edits do not carry an older snapshot of the journal back into App.
  const asSession = (result: AuthResult): AccountSession => ({ ...session, configured: true, authenticated: true, emailAvailable, profile: result.profile, journey: result.journey });
  const accept = (result: AuthResult) => {
    if (!active.current) return;
    const next = asSession(result);
    setPassword(''); setConfirm(''); setParts(['', '', '']); setCode(''); setProfile(result.profile);
    if (result.recoveryCommand) {
      kitOrigin.current = 'auth'; setPending(next); setRecoveryCommand(result.recoveryCommand); setSaved(false); setScreen('kit');
    } else onAuthenticated(next);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (screen !== 'login' && !newPasswordValid()) return;
    void perform(async () => {
      if (screen === 'register') accept(await apiRequest<AuthResult>('register', { authorizedId: authorizedId.trim(), password, callsign: callsign.trim(), timezone, ...(email.trim() ? { email: email.trim() } : {}) }));
      else if (screen === 'login') accept(await apiRequest<AuthResult>('login', { authorizedId: authorizedId.trim(), password }));
      else if (screen === 'recover') accept(await apiRequest<AuthResult>('recover-command', { authorizedId: authorizedId.trim(), command: parts.map(part => part.trim()).join('-'), newPassword: password }));
      else if (screen === 'email-recovery') accept(await apiRequest<AuthResult>('recover-email/verify', { authorizedId: authorizedId.trim(), code: code.trim(), newPassword: password }));
    });
  };
  const updateProfile = (next: AccountProfile) => {
    setProfile(next); onAuthenticated(asSession({ profile: next }));
  };
  const finishKit = () => {
    if (!saved || busy) return;
    setRecoveryCommand(''); setSaved(false); setError('');
    if (pending) onAuthenticated(pending);
    setPending(undefined);
    if (kitOrigin.current === 'rotate') { setScreen('manage'); setRotateOpen(false); setNotice('Your new recovery command is ready. The previous command no longer works.'); }
  };
  const downloadKit = () => {
    const blob = new Blob([`ASTER OUTPOST / PRIVATE RECOVERY KIT\n\nAuthorized ID: ${pending?.profile?.authorizedId ?? profile?.authorizedId ?? authorizedId}\nRecovery command: ${recoveryCommand}\n\nKeep this file somewhere private. Anyone with this command and your ID can recover your account.\nUsing or replacing the command invalidates the previous command.\n`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = 'aster-private-recovery-kit.txt'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice('Recovery kit downloaded. Keep it somewhere private, outside this browser.');
  };
  const titles: Record<Screen, string> = { register: 'Your journey starts here.', login: 'Welcome back.', manage: 'Your account.', recover: 'Recover your account.', 'email-recovery': 'Check your recovery email.', kit: 'Save your way back.' };
  const descriptions: Record<Screen, string> = {
    register: 'Keep your reviews, progress and energy credits between visits.',
    login: 'Sign in to pick up where you left off.',
    manage: 'Your name, recovery options and sign-in settings.',
    recover: 'Use your saved command to choose a new password. Your journal comes with you.',
    'email-recovery': 'We’ll send a code to the email you previously verified.',
    kit: 'One last step. Save this command so you can recover your account later.',
  };
  return <Panel title={titles[screen]} eyebrow="ASTER / OUTPOST ID" onClose={close} className={`account-dialog account-${screen}`}>
    <div className="account-panel" aria-busy={busy}>
      <div className="account-orbit"><span aria-hidden="true">◈</span><p>{descriptions[screen]}</p></div>
      {(screen === 'login' || screen === 'register') && <nav className="account-switch" aria-label="Account options"><button type="button" aria-current={screen === 'login' ? 'page' : undefined} disabled={busy} onClick={() => move('login')}>Sign in</button><button type="button" aria-current={screen === 'register' ? 'page' : undefined} disabled={busy} onClick={() => move('register')}>Create an ID</button></nav>}
      <h3 ref={heading} tabIndex={-1} className="account-step">{screen === 'kit' ? 'Private recovery command' : screen === 'manage' ? `Authorized ID: ${profile?.authorizedId ?? authorizedId}` : 'Your details stay private. ORBIT won’t read them aloud.'}</h3>
      {error && <p className="account-message account-error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
      {notice && <p className="account-message" role="status">{notice}</p>}
      {screen === 'kit' ? <div className="account-kit">
        <p>These three parts make one secret recovery command. It restores your full journey and can be used once. We show it only now.</p>
        <div className="account-command" aria-label="Your private recovery command">{recoveryCommand.split('-').map((part, index) => <div key={index}><small>PART {index + 1}</small><code>{part}</code></div>)}</div>
        <p className="account-private">Keep it private. Anyone with this command and your authorized ID can recover your account.</p>
        <div className="account-actions"><button type="button" className="account-secondary" onClick={() => void perform(async () => { await navigator.clipboard.writeText(recoveryCommand); setNotice('Command copied. Save it in your password manager or another private place.'); })} disabled={busy}>Copy command</button><button type="button" className="account-secondary" onClick={downloadKit}>Download recovery kit</button></div>
        <label className="account-check"><input type="checkbox" checked={saved} onChange={event => { setSaved(event.target.checked); setError(''); }} />I’ve saved my authorized ID and recovery command somewhere private.</label>
        {pending?.profile?.recoveryEmail && !pending.profile.emailVerified && <p className="account-hint">Your optional email still needs verification. Open Citizen access after this step to send a verification code.</p>}
        <button type="button" className="primary" disabled={!saved || busy} onClick={finishKit}>{kitOrigin.current === 'rotate' ? 'Done. Back to my account' : 'My kit is safe. Continue'} ↗</button>
      </div> : screen === 'manage' ? <>
        <form onSubmit={event => { event.preventDefault(); void perform(async () => { const result = await apiRequest<{ profile: AccountProfile }>('profile', { callsign: callsign.trim(), timezone }); updateProfile(result.profile); setNotice('Your callsign and local day are updated.'); }); }}>
          <fieldset disabled={busy} className="account-fields">
            <Field label="Callsign" hint="The name ORBIT uses for you."><input value={callsign} onChange={event => setCallsign(event.target.value)} required maxLength={60} autoComplete="nickname" /></Field>
            <Field label="Your local timezone" hint="Daily missions follow this timezone."><select value={timezone} onChange={event => setTimezone(event.target.value)}>{TIMEZONES.map(zone => <option key={zone}>{zone}</option>)}</select></Field>
            <button className="account-secondary" type="submit">Save profile</button>
          </fieldset>
        </form>
        <section className="account-section" aria-label="Email recovery settings">
          <h4>Citizen contact <span>Optional email</span></h4>
          <p>Add and verify an email for another way to recover your full journey. Your recovery command works without it.</p>
          {profile?.emailVerified && <p className="account-verified">✓ Verified: {profile.recoveryEmail}</p>}
          {!emailAvailable ? <p className="account-hint">Email delivery isn’t connected on this outpost yet. Your saved recovery command remains available.</p> : <>
            <form onSubmit={event => { event.preventDefault(); void perform(async () => { const result = await apiRequest<{ message?: string }>('email/send', { email: email.trim() }); setCodeSent(true); setNotice(result.message || 'Verification code sent. Check your inbox.'); }); }}><fieldset disabled={busy} className="account-fields">
              <Field label={profile?.emailVerified ? 'New recovery email' : 'Recovery email'}><input type="email" value={email} onChange={event => { setEmail(event.target.value); setCodeSent(false); setCode(''); }} required autoComplete="email" maxLength={254} /></Field>
              <button type="submit" className="account-secondary">{codeSent ? 'Send another code' : 'Send verification code'}</button>
            </fieldset></form>
            {codeSent && <form onSubmit={event => { event.preventDefault(); void perform(async () => { const result = await apiRequest<{ profile: AccountProfile }>('email/verify', { code: code.trim() }); updateProfile(result.profile); setCodeSent(false); setCode(''); setNotice('Email verified. Both recovery routes restore your full journey.'); }); }}><fieldset disabled={busy} className="account-fields">
              <Field label="Code from your email"><input value={code} onChange={event => setCode(event.target.value)} required autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} /></Field><button type="submit" className="primary">Verify email</button>
            </fieldset></form>}
          </>}
        </section>
        <section className="account-section"><h4>Recovery command</h4><p>Replacing your command makes the old one stop working. You’ll save a new private kit.</p>
          {!rotateOpen ? <button type="button" className="account-secondary" disabled={busy} onClick={() => { setRotateOpen(true); setPassword(''); }}>Replace my recovery command</button> : <form onSubmit={event => { event.preventDefault(); void perform(async () => { const result = await apiRequest<{ recoveryCommand: string }>('recovery-rotate', { password }); setPassword(''); setRecoveryCommand(result.recoveryCommand); setSaved(false); kitOrigin.current = 'rotate'; setPending(undefined); setScreen('kit'); }); }}><fieldset disabled={busy} className="account-fields"><PasswordField label="Current password" autoComplete="current-password" value={password} onChange={setPassword} /><div className="account-actions"><button className="primary" type="submit">Create a new command</button><button className="account-link" type="button" onClick={() => { setRotateOpen(false); setPassword(''); }}>Cancel</button></div></fieldset></form>}
        </section>
        <div className="account-bottom"><span>Leaving this device? Sign out when you’re done.</span><button type="button" className="account-secondary" disabled={busy} onClick={() => void perform(async () => { await apiRequest('logout', {}); onLogout(); })}>Sign out</button></div>
      </> : <>
        {screen === 'email-recovery' && !codeSent ? <form onSubmit={event => { event.preventDefault(); void perform(async () => { const result = await apiRequest<{ message?: string }>('recover-email/send', { authorizedId: authorizedId.trim() }); setCodeSent(true); setNotice(result.message || 'If this ID has a verified email, a recovery code is on its way.'); }); }}><fieldset disabled={busy} className="account-fields">
          <Field label="Authorized ID" hint="Your account username, not your callsign."><input value={authorizedId} onChange={event => setAuthorizedId(event.target.value)} autoComplete="username" required maxLength={32} /></Field><button type="submit" className="primary" disabled={!emailAvailable}>Send my recovery code</button>
        </fieldset></form> : <form onSubmit={submit}><fieldset disabled={busy} className="account-fields">
          <Field label="Authorized ID" hint={screen === 'register' ? '3–32 letters, numbers, underscores or hyphens. Start with a letter or number. Save it with your recovery kit.' : 'Your account username, not your callsign.'}><input value={authorizedId} onChange={event => setAuthorizedId(event.target.value)} required autoComplete="username" autoCapitalize="none" spellCheck={false} minLength={screen === 'register' ? 3 : undefined} pattern={screen === 'register' ? '[A-Za-z0-9](?:[A-Za-z0-9_]|-){2,31}' : undefined} maxLength={32} readOnly={screen === 'email-recovery'} /></Field>
          {screen === 'register' && <Field label="Callsign" hint="What should ORBIT call you?"><input value={callsign} onChange={event => setCallsign(event.target.value)} required maxLength={60} autoComplete="nickname" /></Field>}
          {screen === 'recover' && <fieldset className="account-recovery-parts"><legend>Your saved recovery command</legend><div>{parts.map((part, index) => <Field key={index} label={`Part ${index + 1}`}><input value={part} onChange={event => setParts(parts.map((old, at) => at === index ? event.target.value : old))} onPaste={event => { const incoming = event.clipboardData.getData('text').trim().split(/[\s-]+/); if (incoming.length === 3) { event.preventDefault(); setParts(incoming); } }} required autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={12} /></Field>)}</div><small>Capital letters are fine. You can paste the whole command into any part.</small></fieldset>}
          {screen === 'email-recovery' && <Field label="Code from your email"><input value={code} onChange={event => setCode(event.target.value)} required autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} /></Field>}
          <PasswordField value={password} onChange={setPassword} label={screen === 'recover' || screen === 'email-recovery' ? 'New authorization password' : 'Authorization password'} autoComplete={screen === 'login' ? 'current-password' : 'new-password'} />
          {screen !== 'login' && <PasswordField value={confirm} onChange={setConfirm} label="Confirm your password" />}
          {screen === 'register' && <>
            <Field label="Your local timezone" hint="Your daily missions use this local day."><select value={timezone} onChange={event => setTimezone(event.target.value)}>{TIMEZONES.map(zone => <option key={zone}>{zone}</option>)}</select></Field>
            <details className="account-optional"><summary>Add a citizen contact <span>Optional email</span></summary><p>Verify an email for a second recovery route. Either verified email or your secret command restores your full journey.</p>{emailAvailable ? <Field label="Recovery email"><input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" maxLength={254} /></Field> : <p className="account-hint">Email delivery isn’t connected yet. You can add one later; your recovery command works on its own.</p>}</details>
          </>}
          <button type="submit" className="primary">{busy ? screen === 'login' ? 'Signing you in…' : screen === 'register' ? 'Creating your ID…' : 'Restoring your account…' : screen === 'register' ? 'Create my outpost ID' : screen === 'login' ? 'Sign in to the outpost' : 'Restore my journey'} ↗</button>
        </fieldset></form>}
        {screen === 'login' ? <div className="account-bottom"><button type="button" className="account-link" disabled={busy} onClick={() => move('recover')}>Lost your access? Recover your account</button><button type="button" className="account-link" disabled={busy} onClick={() => move('register')}>New here? Create an ID</button></div>
          : screen === 'register' ? <div className="account-bottom"><span>Already have an authorized ID?</span><button type="button" className="account-link" disabled={busy} onClick={() => move('login')}>Sign in instead</button></div>
          : <div className="account-bottom"><button type="button" className="account-link" disabled={busy} onClick={() => move('login')}>Back to sign in</button>{screen === 'recover' && emailAvailable ? <button type="button" className="account-link" disabled={busy} onClick={() => move('email-recovery')}>Use my verified email instead</button> : screen === 'email-recovery' ? <button type="button" className="account-link" disabled={busy} onClick={() => move('recover')}>Use my recovery command</button> : null}</div>}
        {(screen === 'recover' || screen === 'email-recovery') && <p className="account-hint">You’ll need your authorized ID and either your saved command or access to a verified email. Without either recovery route, we can’t restore the account.</p>}
      </>}
      {busy && <p className="account-wait" role="status">Connecting securely. This may take a few seconds.</p>}
    </div>
  </Panel>;
}
