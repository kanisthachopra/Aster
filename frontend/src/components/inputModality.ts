let modality: 'keyboard' | 'pointer' = 'keyboard';
const keyboard = () => { modality = 'keyboard'; document.documentElement.dataset.inputModality = modality; };
const pointer = () => { modality = 'pointer'; document.documentElement.dataset.inputModality = modality; };
document.addEventListener('keydown', keyboard, true);
document.addEventListener('pointerdown', pointer, true);
if (import.meta.hot) import.meta.hot.dispose(() => {
  document.removeEventListener('keydown', keyboard, true);
  document.removeEventListener('pointerdown', pointer, true);
});
export const pointerInitiated = () => modality === 'pointer';
