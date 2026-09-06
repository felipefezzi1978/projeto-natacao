"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useState } from "react";

export type WorkoutDetail = {
  id: string;
  title: string;
  source: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  distanceKm: number;
  avgPace: string;
  avgHeartRate: number | null;
  createdAt?: string;
  trackpoints: Array<{
    latitude: number | null;
    longitude: number | null;
    altitude: number | null;
    time: string | null;
    heartRate: number | null;
  }>;
};

export default function WorkoutDetailsPage({ params }: { params: { id: string } }) {
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWorkout = async () => {
      const response = await fetch(`/api/workouts`);
      const data = (await response.json()) as WorkoutDetail[];
      const item = data.find((entry) => entry.id === params.id) ?? null;
      setWorkout(item);
      setLoading(false);
    };

    loadWorkout();
  }, [params.id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
        <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-slate-900/50 p-8 text-center">
          Carregando treino...
        </div>
      </main>
    );
  }

  if (!workout) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
        <div className="mx-auto max-w-4xl rounded-3xl border border-red-500/30 bg-red-500/10 p-8 text-center text-red-200">
          Treino não encontrado.
        </div>
      </main>
    );
  }

  const lastTrackpoint = workout.trackpoints[workout.trackpoints.length - 1];

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-50 md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-sky-300">Detalhes do treino</p>
              <h1 className="mt-2 text-3xl font-bold">{workout.title}</h1>
            </div>

            <a
              href="/"
              className="inline-flex rounded-full border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm text-sky-100"
            >
              Voltar ao painel
            </a>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Data</p>
            <p className="mt-2 font-medium">
              {format(new Date(workout.createdAt ?? workout.startTime), "dd 'de' MMMM, yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Duração</p>
            <p className="mt-2 font-medium">{Math.round(workout.durationMinutes)} min</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Distância</p>
            <p className="mt-2 font-medium">{workout.distanceKm || 0} km</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-300">FC média</p>
            <p className="mt-2 font-medium">
              {workout.avgHeartRate ? `${Math.round(workout.avgHeartRate)} bpm` : "—"}
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold">Resumo</h2>

            <div className="space-y-4 text-sm text-slate-200">
              <div className="flex justify-between rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                <span>Origem</span>
                <strong>{workout.source}</strong>
              </div>
              <div className="flex justify-between rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                <span>Início</span>
                <strong>{workout.startTime}</strong>
              </div>
              <div className="flex justify-between rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                <span>Fim</span>
                <strong>{workout.endTime}</strong>
              </div>
              <div className="flex justify-between rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                <span>Pace médio</span>
                <strong>{workout.avgPace}</strong>
              </div>
              <div className="flex justify-between rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                <span>Último ponto</span>
                <strong>{lastTrackpoint?.time ?? "Sem informação"}</strong>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold">Pontos do percurso</h2>
            <div className="space-y-2 text-sm text-slate-300">
              {workout.trackpoints.slice(0, 8).map((point, index) => (
                <div
                  key={`${point.time ?? index}-${index}`}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 p-3"
                >
                  <span>{point.time ?? `Ponto ${index + 1}`}</span>
                  <span>
                    {point.heartRate ? `${Math.round(point.heartRate)} bpm` : "FC não disponível"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
