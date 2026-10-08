import { visible } from './measurements';
import { POSE_CONNECTIONS, type EvidenceFrame } from './types';

/** No tweening or inferred joints: the frame and overlay share one timestamp. */
export function drawTrackedFrame(canvas: HTMLCanvasElement, bitmap: ImageBitmap, frame: EvidenceFrame) {
  const { width, height } = bitmap;
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  const context = canvas.getContext('2d');
  if (!context) return;
  context.drawImage(bitmap, 0, 0);
  context.lineWidth = Math.max(2, width / 240);
  context.lineCap = 'round';
  context.strokeStyle = '#88ffdf';
  context.shadowColor = '#092c2c';
  context.shadowBlur = 3;
  for (const [a, b] of POSE_CONNECTIONS) {
    const from = frame.landmarks[a], to = frame.landmarks[b];
    if (!visible(from) || !visible(to)) continue;
    context.beginPath(); context.moveTo(from.x * width, from.y * height);
    context.lineTo(to.x * width, to.y * height); context.stroke();
  }
  context.fillStyle = '#f1fff9';
  frame.landmarks.forEach((point, i) => {
    if (i < 11 || !visible(point)) return;
    context.beginPath(); context.arc(point.x * width, point.y * height, Math.max(2.5, width / 180), 0, Math.PI * 2); context.fill();
  });
  context.shadowBlur = 0;
  canvas.dataset.timestamp = frame.timestamp.toFixed(3);
  canvas.dataset.visibleJoints = String(frame.landmarks.filter((point, i) => i >= 11 && visible(point)).length);
}
