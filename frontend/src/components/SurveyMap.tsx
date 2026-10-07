import type { Survey } from '../game/types';
import { EXERCISES } from '../game/types';
import { HABITAT, LANDING } from '../game/terrain';

export default function SurveyMap({ survey, expanded = false, onToggle }: { survey: Survey; expanded?: boolean; onToggle: () => void }) {
  const mapX = (x: number) => 110 + x * .62;
  const mapY = (z: number) => 110 - z * .62;
  return <button className={`survey-map ${expanded ? 'expanded' : ''}`} onClick={onToggle} aria-label={expanded ? 'Minimize survey map' : 'Expand survey map'}>
    <span className="map-caption">SURFACE SURVEY <span>{expanded ? '−' : '+'}</span></span>
    <svg viewBox="0 0 220 220" role="img" aria-label="Local map showing your position, heading and the habitat signal">
      <defs><pattern id="map-grid" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0H0V22" fill="none" stroke="#78a6b6" strokeWidth=".25" /></pattern></defs>
      <rect width="220" height="220" fill="url(#map-grid)" />
      <path d="M26 190C35 170 51 160 50 138S38 102 62 71S92 26 69 8 M37 194C42 171 64 158 62 137S47 107 73 79S106 30 83 3 M48 198C55 175 79 155 74 133S62 111 86 84S119 27 95 2" fill="none" stroke="#95bac5" opacity=".3" strokeWidth="1" />
      <circle cx={mapX(LANDING.x)} cy={mapY(LANDING.z)} r="2" fill="#839ba5" />
      <circle cx={mapX(HABITAT.x)} cy={mapY(HABITAT.z)} r={HABITAT.radius * .62} fill="#78c8d910" stroke="#7cd2dc" strokeDasharray={survey.discovered ? undefined : '2 5'} opacity={survey.discovered ? .8 : .3} />
      <text x={mapX(0)} y={mapY(60) - 33} fill="#bdd9df" textAnchor="middle" fontSize="6">{survey.discovered ? 'OUTPOST 07' : 'UNIDENTIFIED SIGNAL'}</text>
      {survey.inside && EXERCISES.map(ex => <circle key={ex.id} cx={mapX(ex.position[0])} cy={mapY(ex.position[1])} r="2" fill="#c4eee9" />)}
      <g data-testid="map-player" data-x={survey.x.toFixed(1)} data-z={survey.z.toFixed(1)} transform={`translate(${mapX(survey.x)} ${mapY(survey.z)}) rotate(${survey.bearing})`}><path d="M0 -6L4 4L0 2L-4 4Z" fill="#e0f6ef" /><path d="M0 -6L-10 -23Q0 -28 10 -23Z" fill="#bdedf019" /></g>
      <text x="110" y="11" fill="#b3d1d7" textAnchor="middle" fontSize="7">N</text>
    </svg>
    <span className="map-footer">{survey.discovered ? 'HABITAT IDENTIFIED' : 'EXPLORE TO IDENTIFY'}<span data-testid="heading">{Math.round(survey.bearing).toString().padStart(3, '0')}°</span></span>
  </button>;
}
