"use client";

import { ChangeEvent, useEffect, useState } from "react";

import { importWorkout, type WorkoutSummary } from "@/lib/import-workout";

import { calculateWorkoutStats } from "@/lib/workout-stats";

type StoredWorkout = WorkoutSummary & {
  id: string;
};

const upcomingSessions = [
  { day: "Seg", title: "Treino de velocidade", detail: "8 x 50m + 4 x 100m" },
  { day: "Qua", title: "Padrão + resistência", detail: "12 x 200m em ritmo constante" },
  { day: "Sex", title: "Open Water drills", detail: "Sinais, viradas e navegação" },
];

function formatMinutes(minutes: number) {
  const wholeMinutes = Math.round(minutes);
  const hours = Math.floor(wholeMinutes / 60);
  const mins = wholeMinutes % 60;

  if (hours === 0) return `${mins} min`;
  return `${hours}h ${mins}m`;
}

function formatShortDate(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Sem data";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workout, setWorkout] = useState<WorkoutSummary | null>(null);
  const [history, setHistory] = useState<StoredWorkout[]>([]);

  const totals = calculateWorkoutStats(history);
  const stats = [
    { label: "Treinos no m\u00eas", value: String(totals.monthlyCount), change: "Pela data do treino, no m\u00eas atual" },
    { label: "Dist\u00e2ncia total", value: totals.distanceKm.toLocaleString("pt-BR", { maximumFractionDigits: 3 }) + " km", change: "Todo o hist\u00f3rico importado" },
    { label: "Tempo em \u00e1gua", value: formatMinutes(totals.durationMinutes), change: "Todo o hist\u00f3rico importado" },
    { label: "Ritmo m\u00e9dio", value: totals.avgPace, change: "Ponderado pela dist\u00e2ncia dos treinos" },
  ];

  useEffect(() => {
    let active = true;
    fetch("/api/workouts").then(async response => {
      if (!response.ok) throw new Error("Falha ao carregar o hist\u00f3rico.");
      const data = await response.json() as StoredWorkout[];
      if (active) setHistory(data);
    }).catch(() => {
      if (active) setError("Falha ao carregar o hist\u00f3rico.");
    });
    return () => { active = false; };
  }, []);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    event.target.value = "";
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setWorkout(null);

    try {
      const parsedWorkout = await importWorkout(file);

      const response = await fetch("/api/workouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...parsedWorkout,
          createdAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Não foi possível salvar este treino.");
      }

      const saved = (await response.json()) as StoredWorkout;
      setWorkout(saved);
      setHistory(current => [saved, ...current]);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Não foi possível importar este treino.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 text-slate-50 md:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-6 rounded-3xl border border-white/10 bg-slate-900/40 p-6 shadow-2xl backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-sky-300">Natação</p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">Open Water Coach</h1>
          </div>

          <div className="flex items-center gap-3 rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-sm text-sky-100">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />
            Importação manual Garmin
          </div>
        </header>

        <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <article
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 shadow-lg"
            >
              <p className="text-sm text-slate-300">{stat.label}</p>
              <div className="mt-4 flex items-end justify-between gap-3">
                <strong className="text-3xl font-semibold">{stat.value}</strong>
              </div>
              <p className="mt-3 text-xs text-emerald-300">{stat.change}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Próximos treinos</h2>
              <button className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-sm text-sky-200">
                + Novo bloco
              </button>
            </div>

            <div className="space-y-4">
              {upcomingSessions.map((session) => (
                <div
                  key={session.title}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/15 font-semibold text-sky-200">
                    {session.day}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{session.title}</h3>
                    <p className="text-sm text-slate-300">{session.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-xl">
              <h2 className="text-xl font-semibold">Importar treino Garmin</h2>

              <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-sky-500/40 bg-sky-500/5 px-6 py-8 text-center transition hover:border-sky-400 hover:bg-sky-500/10">
                <span className="text-base font-medium text-sky-100">
                  {isLoading ? "Importando..." : "Selecionar arquivo ZIP / GPX / TCX / FIT"}
                </span>
                <span className="mt-2 text-sm text-slate-300">
                  Selecione o ZIP exportado do Garmin Connect ou um arquivo GPX, TCX ou FIT (até 20 MB).
                </span>
                <input
                  type="file"
                  accept=".zip,.gpx,.tcx,.fit"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isLoading}
                />
              </label>

              {error ? (
                <div className="mt-4 rounded-2xl border border-red-400/50 bg-red-500/10 p-4 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              {workout ? (
                <div className="mt-5 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
                  <p className="text-sm text-emerald-200">Treino importado com sucesso</p>
                  <p className="mt-2 text-sm">{workout.distanceKm} km / {workout.avgPace}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Nome</p>
                      <p className="mt-1 font-medium text-white">{workout.title}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Origem</p>
                      <p className="mt-1 font-medium text-white">{workout.source}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Duração</p>
                      <p className="mt-1 font-medium text-white">{formatMinutes(workout.durationMinutes)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-300">FC média</p>
                      <p className="mt-1 font-medium text-white">
                        {workout.avgHeartRate ? `${Math.round(workout.avgHeartRate)} bpm` : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-xl">
              <h2 className="text-xl font-semibold">Histórico de treinos</h2>
              <div className="mt-5 space-y-3">
                {history.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
                    Ainda não há treinos salvos. Importe o primeiro arquivo Garmin para começar.
                  </div>
                ) : (
                  history.map((item) => (
                    <a
                      key={item.id}
                      href={`/treino/${item.id}`}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 p-3 transition hover:border-sky-500/50 hover:bg-slate-950/60"
                    >
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-slate-400">{formatShortDate(item.startTime)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sky-200">{item.distanceKm ? `${item.distanceKm} km` : `${Math.round(item.durationMinutes)} min`}</p>
                        <p className="text-xs text-slate-400">{item.avgPace}</p>
                      </div>
                    </a>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
