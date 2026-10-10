/** Reviewed knowledge is versioned with code, never silently trained on user recordings.
 * Human-readable sources/update policy: research/movement-understanding.md and movement-sources.md.
 */
export const MOVEMENT_KNOWLEDGE_VERSION = '1.2.0';
export const MOVEMENT_ANALYSIS_VERSION = 'partial-review-0.11';
export type BodyRegion = 'head'|'shoulders'|'elbows'|'hands'|'hips'|'knees'|'feet';
export interface VisualContext {
 exerciseObserved: 'pullup'|'pushup'|'squat'|'uncertain';
 view: 'side'|'front'|'angled'|'uncertain';
 visibleRegions: BodyRegion[];
 frameIndices: number[];
}
export function evidenceScope(id:string):string {
 if(id==='pullup-return-together')return 'your visible chest and hips returning together with the hand in view; a full rep and shoulder position remain separate questions';
 if(id.includes('forearm'))return 'the visible forearm movement; shoulder position and elbow bend remain unmeasured';
 if(id.includes('shin'))return 'the visible lower-leg movement; knee bend and hip movement remain unmeasured';
 if(id.includes('arm-'))return 'the visible arm bending and returning; this does not establish your whole-body form';
 if(id.includes('leg-'))return 'the visible leg bending and returning; your upper-body movement is a separate check';
 if(id.includes('timing')||id.includes('together'))return 'the visible timing between your chest and hips';
 return 'the movement in this linked part of your recording';
}
