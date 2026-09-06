import type { WorkoutSummary } from "./import-workout";

type WorkoutMetrics = Pick<WorkoutSummary, "startTime" | "durationMinutes" | "distanceKm">;

export function workoutDate(value: string): Date | null {
  const result = new Date(value);
  return Number.isFinite(result.getTime()) ? result : null;
}

export function calculateWorkoutStats(workouts: WorkoutMetrics[], now = new Date()) {
  let monthlyCount = 0;
  let distanceKm = 0;
  let durationMinutes = 0;
  let paceDistance = 0;
  let paceMinutes = 0;
  for (const workout of workouts) {
    const date = workoutDate(workout.startTime);
    if (date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) monthlyCount++;
    const distance = Number.isFinite(workout.distanceKm) && workout.distanceKm > 0 ? workout.distanceKm : 0;
    const duration = Number.isFinite(workout.durationMinutes) && workout.durationMinutes > 0 ? workout.durationMinutes : 0;
    distanceKm += distance;
    durationMinutes += duration;
    // Only activities with both measurements contribute to pace.
    if (distance && duration) {
      paceDistance += distance;
      paceMinutes += duration;
    }
  }
  const seconds = paceDistance ? Math.round(paceMinutes * 6 / paceDistance) : null;
  const avgPace = seconds === null ? "—" : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} /100m`;
  return { monthlyCount, distanceKm, durationMinutes, avgPace };
}
