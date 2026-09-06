import { NextResponse } from "next/server";

const STORAGE_FILE = "workouts.json";

function getStoragePath() {
  return `${process.cwd()}/src/data/${STORAGE_FILE}`;
}

async function readWorkouts() {
  try {
    const fs = await import("fs/promises");
    const path = getStoragePath();
    await fs.mkdir("src/data", { recursive: true });
    const file = await fs.readFile(path, "utf-8");
    return JSON.parse(file) as Array<Record<string, unknown>>;
  } catch {
    return [];
  }
}

async function writeWorkouts(workouts: Array<Record<string, unknown>>) {
  const fs = await import("fs/promises");
  const path = getStoragePath();
  await fs.mkdir("src/data", { recursive: true });
  await fs.writeFile(path, JSON.stringify(workouts, null, 2), "utf-8");
}

export async function GET() {
  const workouts = await readWorkouts();
  return NextResponse.json(workouts);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
    }

    const normalizedWorkout = {
      ...body,
      id: crypto.randomUUID(),
      createdAt: body.createdAt ?? new Date().toISOString(),
    };

    const workouts = await readWorkouts();
    const nextWorkouts = [normalizedWorkout, ...workouts];

    await writeWorkouts(nextWorkouts);

    return NextResponse.json(normalizedWorkout, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao salvar treino." },
      { status: 500 },
    );
  }
}
