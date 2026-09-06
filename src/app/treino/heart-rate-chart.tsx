"use client";

import { useMemo, useState } from "react";
import type { Trackpoint } from "@/lib/import-workout";

export default function HeartRateChart({ trackpoints, startTime, endTime }: {
  trackpoints: Trackpoint[]; startTime: string; endTime: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const points = useMemo(() => trackpoints.flatMap(p => {
    const time = p.time ? Date.parse(p.time) : NaN;
    return Number.isFinite(time) && p.heartRate !== null && Number.isFinite(p.heartRate) && p.heartRate > 0
      ? [{ time, rate: p.heartRate }] : [];
  }).sort((a, b) => a.time - b.time), [trackpoints]);
  const clock = (time: number) => new Date(time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  if (!points.length) return <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6"><h2 className="text-xl font-semibold">Frequência cardíaca ao longo do treino</h2><p className="mt-4 text-slate-300">Este arquivo não contém registros de frequência cardíaca com horário.</p></div>;
  const first = points[0], last = points[points.length - 1];
  const start = Number.isFinite(Date.parse(startTime)) ? Math.min(Date.parse(startTime), first.time) : first.time;
  const end = Number.isFinite(Date.parse(endTime)) ? Math.max(Date.parse(endTime), last.time) : last.time;
  const span = Math.max(1000, end - start);
  const rates = points.map(p => p.rate);
  const min = rates.reduce((a, b) => Math.min(a, b), Infinity);
  const max = rates.reduce((a, b) => Math.max(a, b), -Infinity);
  const low = Math.max(0, Math.floor((min - 10) / 10) * 10);
  const high = Math.ceil((max + 10) / 10) * 10;
  const x = (time: number) => 58 + (time - start) / span * 700;
  const y = (rate: number) => 230 - (rate - low) / (high - low) * 200;
  // Leave gaps where the recording has no heart-rate samples for over a minute.
  const path = points.map((p, i) => `${i === 0 || p.time - points[i - 1].time > 60000 ? 'M' : 'L'}${x(p.time).toFixed(2)},${y(p.rate).toFixed(2)}`).join(' ');
  const active = selected === null ? null : points[Math.min(selected, points.length - 1)];
  return <div className="min-w-0 rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-xl">
    <h2 className="text-xl font-semibold">Frequência cardíaca ao longo do treino</h2>
    <p className="mt-2 text-sm text-slate-300">Batimentos por minuto (bpm), do início ao fim. Passe o mouse ou toque no gráfico para consultar um registro.</p>
    <p className="mt-4 text-sm text-sky-200">Mínima: {min} bpm · Máxima: {max} bpm</p>
    <svg viewBox="0 0 800 280" className="mt-3 w-full" role="img" aria-label={`Frequência cardíaca de ${clock(start)} a ${clock(end)}. Mínima ${min}, máxima ${max} bpm.`}
      onPointerMove={event => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const target = start + Math.max(0, Math.min(1, ((event.clientX - bounds.left) / bounds.width * 800 - 58) / 700)) * span;
        let left = 0, right = points.length - 1;
        while (left < right) { const middle = Math.floor((left + right) / 2); if (points[middle].time < target) left = middle + 1; else right = middle; }
        setSelected(left > 0 && target - points[left - 1].time < points[left].time - target ? left - 1 : left);
      }}>
      {[0, 1, 2, 3, 4].map(i => {
        const rate = low + (high - low) * i / 4;
        return <g key={i}><line x1="58" x2="758" y1={y(rate)} y2={y(rate)} stroke="#334155"/><text x="48" y={y(rate) + 4} textAnchor="end" fill="#cbd5e1" fontSize="12">{Math.round(rate)}</text></g>;
      })}
      <text x="15" y="16" fill="#cbd5e1" fontSize="12">bpm</text>
      {[0, 1, 2, 3, 4].map(i => <text key={i} x={58 + i * 175} y="258" textAnchor="middle" fill="#cbd5e1" fontSize="12">{clock(start + span * i / 4)}</text>)}
      <path d={path} fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinejoin="round"/>
      {points.length === 1 && <circle cx={x(first.time)} cy={y(first.rate)} r="4" fill="#38bdf8"/>}
      {active && <g><line x1={x(active.time)} x2={x(active.time)} y1="30" y2="230" stroke="#94a3b8" strokeDasharray="4 4"/><circle cx={x(active.time)} cy={y(active.rate)} r="5" fill="#f8fafc"/></g>}
    </svg>
    <label className="block text-sm text-slate-300">Consultar registro
      <input aria-label="Registro de frequência cardíaca" type="range" min="0" max={points.length - 1} value={selected ?? 0} onChange={event => setSelected(Number(event.target.value))} className="mt-2 block w-full accent-sky-400"/>
    </label>
    <p aria-live="polite" className="mt-2 min-h-6 text-sm text-sky-200">{active ? `${clock(active.time)} — ${active.rate} bpm` : `${points.length.toLocaleString('pt-BR')} registros de frequência cardíaca`}</p>
    <p className="mt-2 text-xs text-slate-400">Horário local. Lacunas maiores que um minuto ficam sem linha; o gráfico não estima valores ausentes.</p>
  </div>;
}
