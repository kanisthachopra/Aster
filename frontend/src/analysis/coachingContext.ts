export interface CoachingContext {
  goal: 'control' | 'strength' | 'comfortable';
  discomfort: 'not-said' | 'none' | 'pain' | 'instability';
  variant: 'standard' | 'assisted' | 'dynamic';
}
export const DEFAULT_COACHING_CONTEXT: CoachingContext = {goal:'control',discomfort:'not-said',variant:'standard'};
export const SHOULDER_SOURCE = {title:'Shoulder instability · AAOS',url:'https://www.orthoinfo.org/diseases--conditions/chronic-shoulder-instability/'};
export function injuryResponse(context:CoachingContext,question=''):string|null {
  if(context.discomfort==='instability'||/dislocat|sublux|slip(?:s|ping)? out|shoulder.*(?:went|pops?) out|unstable|instability/i.test(question))
    return 'Thanks for telling me. A shoulder that keeps slipping out needs an assessment from a physiotherapist or an orthopaedic clinician. I can show what moved in this recording, but I can’t choose a safe grip, shoulder position or rep target for you. Before another set, ask them which exercises and range are appropriate for your shoulder.';
  if(context.discomfort==='pain'||/\b(pain(?:ful)?|hurts?|injur(?:y|ed)|numb(?:ness)?|tingl(?:ing)?|sharp ache|sore)\b/i.test(question))
    return 'Let’s put comfort first. If this movement hurts, stop the set rather than push through it. A recording can’t explain the cause or decide what is safe for you. If it persists, or the joint feels unstable, get it assessed. We can still look at the visible movement without turning it into a prescription.';
  return null;
}
