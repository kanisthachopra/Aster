import { useId, useMemo } from 'react';
import type { Survey } from '../game/types';
import { EXERCISES } from '../game/types';
import { HABITAT, LANDING, terrainHeight } from '../game/terrain';
import { GAME_STATIONS } from '../game/miniGames';
import './controls-map.css';

type Bounds = { left: number; north: number; span: number };
const OUTSIDE: Bounds = { left: -185, north: 192.5, span: 370 };
const INSIDE: Bounds = { left: -50, north: 110, span: 100 };
const WIDTH = 220;
const OFFSET = 20;
const mapX = (x: number, bounds: Bounds) => OFFSET + (x - bounds.left) / bounds.span * WIDTH;
const mapY = (z: number, bounds: Bounds) => OFFSET + (bounds.north - z) / bounds.span * WIDTH;
let terrainImage: string | undefined;

/** Survey relief samples the same elevation function as the explorable ground. */
function reliefImage() {
  if (terrainImage) return terrainImage;
  const size = 256;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) return '';
  const image = context.createImageData(size, size);
  for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
    const x = OUTSIDE.left + col / size * OUTSIDE.span;
    const z = OUTSIDE.north - row / size * OUTSIDE.span;
    const h = terrainHeight(x, z);
    const dx = (terrainHeight(x + 2, z) - terrainHeight(x - 2, z)) / 4;
    const dz = (terrainHeight(x, z + 2) - terrainHeight(x, z - 2)) / 4;
    const illumination = Math.max(.12, (-dx * -.6 + -dz * .6 + .53) / Math.hypot(dx, dz, 1));
    const elevation = Math.min(1, Math.max(0, h / 28));
    const shade = .55 + illumination * .65;
    const i = (row * size + col) * 4;
    image.data[i] = (33 + elevation * 66) * shade;
    image.data[i + 1] = (49 + elevation * 67) * shade;
    image.data[i + 2] = (52 + elevation * 55) * shade;
    image.data[i + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  terrainImage = canvas.toDataURL();
  return terrainImage;
}

export default function SurveyMap({ survey, expanded = false, onToggle }: { survey: Survey; expanded?: boolean; onToggle: () => void }) {
  const id = useId().replace(/:/g, '');
  const relief = useMemo(reliefImage, []);
  const bounds = survey.inside ? INSIDE : OUTSIDE;
  const x = (value: number) => mapX(value, bounds);
  const y = (value: number) => mapY(value, bounds);
  const metres = survey.inside ? 10 : 50;
  const radius = HABITAT.radius / bounds.span * WIDTH;
  const bearing = (Math.round(survey.bearing) % 360 + 360) % 360;
  const distance = Math.round(Math.hypot(survey.x - HABITAT.x, survey.z - HABITAT.z));
  const coordinate = (value: number, positive: string, negative: string) => `${Math.round(Math.abs(value))}${value >= 0 ? positive : negative}`;
  return <button className={`survey-map terrain-survey ${expanded ? 'expanded' : ''}`} onClick={onToggle}
    aria-expanded={expanded} aria-label={expanded ? 'Minimize survey map' : 'Expand survey map'}>
    <span className="map-caption"><span>{survey.inside ? 'HABITAT / FLOOR PLAN' : 'SURFACE / TOPOGRAPHY'}</span><span aria-hidden="true">{expanded ? '−' : '+'}</span></span>
    <svg viewBox="0 0 260 260" role="img" aria-label={survey.inside ? 'Habitat floor plan: three exercise stations, three recreation consoles, southern entrance, and a closed northern sector' : 'North-up terrain map showing landing site, habitat signal, and your position'}>
      <defs>
        <pattern id={`${id}-grid`} width="44" height="44" patternUnits="userSpaceOnUse"><path d="M44 0H0V44" fill="none" stroke="#bfded8" strokeWidth=".55" opacity=".18" /></pattern>
        <pattern id={`${id}-closed`} width="7" height="7" patternUnits="userSpaceOnUse"><path d="M0 7L7 0" stroke="#cbb48a" strokeWidth="1" opacity=".3" /></pattern>
        <clipPath id={`${id}-habitat`}><circle cx={x(HABITAT.x)} cy={y(HABITAT.z)} r={radius} /></clipPath>
      </defs>
      <rect x="20" y="20" width="220" height="220" fill="#0f2329" rx="2" />
      {!survey.inside && <image href={relief} x="20" y="20" width="220" height="220" />}
      <rect x="20" y="20" width="220" height="220" fill={`url(#${id}-grid)`} />
      {!survey.inside && <>
        <rect x={x(-185)} y={y(175)} width={370 / bounds.span * WIDTH} height={335 / bounds.span * WIDTH} fill="none" stroke="#b5ccc7" strokeOpacity=".25" strokeDasharray="2 4" />
        <path d={`M${x(LANDING.x) - 3} ${y(LANDING.z) - 3}l6 6m0 -6l-6 6`} stroke="#d8cdc0" strokeWidth="1.7" />
        <text className="map-label" x={x(LANDING.x) + 8} y={y(LANDING.z) + 3}>LANDING</text>
        {expanded && <text className="map-place" x={x(-73)} y={y(-24)} transform={`rotate(-72 ${x(-73)} ${y(-24)})`}>WEST RIDGE</text>}
      </>}
      <circle cx={x(HABITAT.x)} cy={y(HABITAT.z)} r={radius} fill={survey.inside ? '#1c3840' : '#1d4b4d66'} stroke={survey.discovered ? '#a5dfd2' : '#bcbda4'} strokeWidth="1.3" strokeDasharray={survey.discovered ? undefined : '3 4'} />
      {!survey.inside && <text className="map-label" x={x(HABITAT.x)} y={y(HABITAT.z) - radius - 8} textAnchor="middle">{survey.discovered ? 'HABITAT 07' : 'UNKNOWN SIGNAL'}</text>}
      {(survey.inside || survey.discovered) && <>
        <path d={`M${x(-3)} ${y(18)}H${x(3)}`} stroke="#f3dbad" strokeWidth="4" />
        <text className="map-label" x={x(0)} y={y(18) + 14} textAnchor="middle">ENTRY</text>
      </>}
      {survey.inside && <>
        <g clipPath={`url(#${id}-habitat)`}>
          <rect x={x(-50)} y={y(110)} width="220" height={27.5 / bounds.span * WIDTH} fill={`url(#${id}-closed)`} />
          <path d={`M${x(-40)} ${y(82.5)}H${x(40)}`} stroke="#c8b284" strokeWidth="1" strokeDasharray="3 3" />
          <text className="map-label map-closed-label" x={x(0)} y={y(91)} textAnchor="middle">LOCKED SECTORS</text>
        </g>
        {EXERCISES.map(ex => <g key={ex.id}>
          <circle cx={x(ex.position[0])} cy={y(ex.position[1])} r="7" fill="#81c8c215" stroke="#a5dfd2" strokeWidth="1" />
          <text className="map-station-number" x={x(ex.position[0])} y={y(ex.position[1]) + 3} textAnchor="middle">{ex.number}</text>
          <text className="map-label map-exercise-label" x={x(ex.position[0])} y={y(ex.position[1]) + 19} textAnchor="middle">{ex.name}</text>
        </g>)}
        {GAME_STATIONS.map((game, index) => <g key={game.id}>
          <path d={`M${x(game.position[0])} ${y(game.position[1]) - 5}l5 5l-5 5l-5 -5Z`} fill={`${game.color}33`} stroke={game.color} strokeWidth="1.2" />
          <text className="map-game-number" x={x(game.position[0])} y={y(game.position[1]) + 2} textAnchor="middle">{['S', 'M', 'O'][index]}</text>
          {expanded && <text className="map-label map-game-label" x={x(game.position[0])} y={y(game.position[1]) + 15} textAnchor="middle">{['SIGNAL', 'MEMORY', 'ORBIT'][index]}</text>}
        </g>)}
      </>}
      <g data-testid="map-player" data-x={survey.x.toFixed(1)} data-z={survey.z.toFixed(1)} transform={`translate(${x(survey.x)} ${y(survey.z)}) rotate(${survey.bearing})`}>
        <path d="M0 -8L-11 -26Q0 -31 11 -26Z" fill="#dafaf020" />
        <circle r="9" fill="#081a22" fillOpacity=".8" />
        <path d="M0 -7L5 5L0 3L-5 5Z" fill="#f1fff8" stroke="#0a262c" strokeWidth="1" />
      </g>
      <g className="map-north"><path d="M230 10V1m-3 3l3 -3l3 3" fill="none" stroke="currentColor" /><text x="218" y="9" textAnchor="middle">N</text></g>
      <path d={`M21 246v4h${metres / bounds.span * WIDTH}v-4`} fill="none" stroke="#c1d5ce" />
      <text className="map-scale" x={26 + metres / bounds.span * WIDTH} y="253">{metres} m</text>
      <text className="map-coordinate" x="239" y="253" textAnchor="end">{coordinate(survey.x, 'E', 'W')} · {coordinate(survey.z, 'N', 'S')}</text>
    </svg>
    <span className="map-footer"><span>{survey.inside ? '03 STATIONS · 03 GAMES' : `${distance} m / ${survey.discovered ? 'HABITAT' : 'SIGNAL'}`}</span><span data-testid="heading">{bearing.toString().padStart(3, '0')}°</span></span>
    {expanded && <span className="map-legend"><span><i />YOU</span>{survey.inside && <span>◇ PLAY</span>}<span>{survey.inside ? 'HATCHED / LOCKED' : 'SHADED / ELEVATION'}</span></span>}
  </button>;
}
