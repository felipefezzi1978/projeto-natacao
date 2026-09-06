import { describe, expect, it } from "vitest";
import { calculateWorkoutStats, workoutDate } from "./workout-stats";

describe("estatisticas dos treinos", () => {
  it("conta o mes da atividade e soma todo o historico", () => {
    const result = calculateWorkoutStats([
      { startTime: '2026-01-18T11:32:03Z', distanceKm: 5.05, durationMinutes: 103 },
      { startTime: '2026-09-02T12:00:00Z', distanceKm: 1, durationMinutes: 20 },
      { startTime: '2025-09-02T12:00:00Z', distanceKm: 1, durationMinutes: 30 },
    ], new Date(2026, 8, 6));
    expect(result.monthlyCount).toBe(1);
    expect(result.distanceKm).toBe(7.05);
    expect(result.durationMinutes).toBe(153);
    expect(result.avgPace).toBe('2:10 /100m');
  });
  it("pondera ritmo por distancia e exclui dados incompletos do ritmo", () => {
    const result = calculateWorkoutStats([
      { startTime: 'Sem data', distanceKm: 1, durationMinutes: 20 },
      { startTime: 'Sem data', distanceKm: 3, durationMinutes: 90 },
      { startTime: 'Sem data', distanceKm: 0, durationMinutes: 100 },
    ]);
    expect(result.avgPace).toBe('2:45 /100m');
    expect(result.durationMinutes).toBe(210);
    expect(result.monthlyCount).toBe(0);
  });
  it("atualiza os totais ao adicionar uma importacao", () => {
    const workouts = [{ startTime: '2026-01-18T11:32:03Z', distanceKm: 1, durationMinutes: 20 }];
    expect(calculateWorkoutStats(workouts).distanceKm).toBe(1);
    expect(calculateWorkoutStats([...workouts, ...workouts]).distanceKm).toBe(2);
  });
  it("trata historico vazio e datas ausentes", () => {
    expect(calculateWorkoutStats([])).toEqual({ monthlyCount: 0, distanceKm: 0, durationMinutes: 0, avgPace: '—' });
    expect(workoutDate('Sem data')).toBeNull();
    expect(workoutDate('2026-01-18T11:32:03Z')?.toISOString()).toBe('2026-01-18T11:32:03.000Z');
  });
});
