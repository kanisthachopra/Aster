import type { ExerciseId } from '../game/types';

export interface Landmark { x: number; y: number; z: number; visibility: number; }
export interface FrameMetrics { elbow: number; knee: number; hip: number; bodyTilt: number; side: 'left' | 'right'; orientationMatches: boolean; }
export interface EvidenceFrame { timestamp: number; landmarks: Landmark[]; metrics: FrameMetrics | null; }
export interface Finding { id: string; title: string; observation: string; suggestion: string; timestamp: number; }
export interface AnalysisReport {
  id: string; exercise: ExerciseId; status: 'usable' | 'insufficient'; duration: number;
  width: number; height: number; sampledFrames: number; usableFrames: number; coverage: number;
  findings: Finding[]; frames: EvidenceFrame[]; summary: string; limitations: string[];
  sources: { title: string; url: string }[]; estimatedRepetitions: number;
}
export interface AnalysisProgress {
  stage: 'loading' | 'sampling' | 'summarizing'; completed: number; total: number; message: string; frame?: EvidenceFrame;
}
export const POSE_CONNECTIONS: [number, number][] = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28],[27,29],[29,31],[28,30],[30,32]];
