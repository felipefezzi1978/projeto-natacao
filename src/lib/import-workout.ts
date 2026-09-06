export type Trackpoint = {
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  time: string | null;
  heartRate: number | null;
};

export type WorkoutSummary = {
  title: string;
  source: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  distanceKm: number;
  avgPace: string;
  avgHeartRate: number | null;
  createdAt?: string;
  trackpoints: Trackpoint[];
};

const number = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
};
const positive = (value: unknown) => {
  const result = number(value);
  return result !== null && result >= 0 ? result : null;
};
const date = (value: unknown): string | null => {
  if (!(typeof value === "string" || value instanceof Date)) return null;
  const result = new Date(value);
  return Number.isFinite(result.getTime()) ? result.toISOString() : null;
};
const elements = (root: Element | Document, name: string) =>
  Array.from(root.getElementsByTagNameNS("*", name));
const text = (root: Element, name: string) => elements(root, name)[0]?.textContent ?? null;

function gpsDistance(groups: Trackpoint[][]) {
  let meters = 0;
  for (const group of groups) {
    for (let i = 1; i < group.length; i++) {
      const a = group[i - 1], b = group[i];
      if (a.latitude === null || a.longitude === null || b.latitude === null || b.longitude === null) continue;
      const rad = Math.PI / 180;
      const h = Math.sin((b.latitude - a.latitude) * rad / 2) ** 2
        + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad)
        * Math.sin((b.longitude - a.longitude) * rad / 2) ** 2;
      meters += 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
    }
  }
  return meters;
}

function summary(source: string, trackpoints: Trackpoint[], distance: number,
  seconds: number | null, start: string | null, end: string | null, heartRate: number | null): WorkoutSummary {
  const times = trackpoints.flatMap(p => p.time ? [p.time] : []).sort();
  start ??= times[0] ?? null;
  end ??= times.at(-1) ?? null;
  seconds ??= start && end ? Math.max(0, (Date.parse(end) - Date.parse(start)) / 1000) : 0;
  if (!trackpoints.length && !distance && !seconds) throw new Error("O arquivo não contém dados de treino.");
  const rates = trackpoints.flatMap(p => p.heartRate !== null && p.heartRate > 0 ? [p.heartRate] : []);
  const pace = distance > 0 && seconds > 0 ? Math.round(seconds * 100 / distance) : null;
  return {
    title: `Treino importado (${source})`, source,
    startTime: start ?? "Sem data", endTime: end ?? "Sem data",
    durationMinutes: seconds / 60, distanceKm: Math.round(distance) / 1000,
    avgPace: pace === null ? "—" : `${Math.floor(pace / 60)}:${String(pace % 60).padStart(2, "0")} /100m`,
    avgHeartRate: heartRate ?? (rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : null),
    trackpoints,
  };
}

export function parseXml(xmlText: string, source: "GPX" | "TCX"): WorkoutSummary {
  const xml = new DOMParser().parseFromString(xmlText, "application/xml");
  if (elements(xml, "parsererror").length || xml.documentElement.localName !== (source === "GPX" ? "gpx" : "TrainingCenterDatabase")) {
    throw new Error(`Arquivo ${source} inválido ou corrompido.`);
  }
  if (source === "TCX" && elements(xml, "Activity").length !== 1) {
    throw new Error("Exporte um arquivo TCX contendo exatamente uma atividade.");
  }
  const groups = elements(xml, source === "GPX" ? "trkseg" : "Track").map(group =>
    elements(group, source === "GPX" ? "trkpt" : "Trackpoint").map(p => {
      const latitude = number(source === "GPX" ? p.getAttribute("lat") : text(p, "LatitudeDegrees"));
      const longitude = number(source === "GPX" ? p.getAttribute("lon") : text(p, "LongitudeDegrees"));
      return {
        latitude: latitude !== null && Math.abs(latitude) <= 90 ? latitude : null,
        longitude: longitude !== null && Math.abs(longitude) <= 180 ? longitude : null,
        altitude: number(text(p, source === "GPX" ? "ele" : "AltitudeMeters")),
        time: date(text(p, source === "GPX" ? "time" : "Time")),
        heartRate: positive(source === "GPX" ? text(p, "hr") : elements(p, "HeartRateBpm")[0]?.textContent?.trim()),
      };
    }));
  const laps = source === "TCX" ? elements(xml, "Lap") : [];
  const lapDistances = laps.map(lap => positive(Array.from(lap.children).find(c => c.localName === "DistanceMeters")?.textContent));
  const lapTimes = laps.map(lap => positive(text(lap, "TotalTimeSeconds")));
  const distance = lapDistances.length && lapDistances.every(v => v !== null)
    ? lapDistances.reduce((a, b) => a + b, 0) : gpsDistance(groups);
  const seconds = lapTimes.length && lapTimes.every(v => v !== null) ? lapTimes.reduce((a, b) => a + b, 0) : null;
  return summary(source, groups.flat(), distance, seconds, date(laps[0]?.getAttribute("StartTime")), null, null);
}

export async function parseFit(buffer: ArrayBuffer): Promise<WorkoutSummary> {
  const { Decoder, Stream } = await import("@garmin/fitsdk");
  const decoder = new Decoder(Stream.fromArrayBuffer(buffer));
  if (!decoder.isFIT() || !decoder.checkIntegrity()) throw new Error("Arquivo FIT inválido ou corrompido.");
  const { messages, errors } = decoder.read();
  if (errors.length) throw new Error("Não foi possível decodificar o arquivo FIT.");
  const data = messages as unknown as Record<string, Record<string, unknown>[]>;
  const sessions = data.sessionMesgs ?? [];
  if (sessions.length > 1) throw new Error("Importe um FIT de uma única sessão; arquivos multiesporte ainda não são suportados.");
  const session = sessions[0] ?? {};
  const records = data.recordMesgs ?? [];
  const trackpoints = records.map(p => ({
    latitude: number(p.positionLat) === null ? null : Number(p.positionLat) * 180 / 2 ** 31,
    longitude: number(p.positionLong) === null ? null : Number(p.positionLong) * 180 / 2 ** 31,
    altitude: number(p.enhancedAltitude ?? p.altitude), time: date(p.timestamp), heartRate: positive(p.heartRate),
  }));
  const distance = positive(session.totalDistance) ?? positive(records.at(-1)?.distance) ?? gpsDistance([trackpoints]);
  return summary("FIT", trackpoints, distance, positive(session.totalTimerTime) ?? positive(session.totalElapsedTime),
    date(session.startTime), date(session.timestamp), positive(session.avgHeartRate));
}

export async function parseZip(buffer: ArrayBuffer): Promise<WorkoutSummary> {
  const { unzipSync, strFromU8 } = await import("fflate");
  const candidates: { name: string; originalSize: number }[] = [];
  const bytes = new Uint8Array(buffer);
  try {
    unzipSync(bytes, { filter: entry => {
      if (/\.(fit|gpx|tcx)$/i.test(entry.name) && !entry.name.split("/").some(part => part === "__MACOSX" || part.startsWith("._"))) candidates.push(entry);
      return false;
    } });
  } catch {
    throw new Error("ZIP invalido ou corrompido. Exporte novamente pelo Garmin Connect.");
  }
  if (!candidates.length) throw new Error("O ZIP nao contem um arquivo FIT, GPX ou TCX.");
  if (candidates.length > 1) throw new Error("O ZIP contem varios treinos. Exporte uma atividade por ZIP ou extraia e importe os arquivos individualmente.");
  const selected = candidates[0];
  if (selected.originalSize > 20 * 1024 * 1024) throw new Error("O treino dentro do ZIP excede o limite de 20 MB.");
  let content: Uint8Array;
  try {
    content = unzipSync(bytes, { filter: entry => entry.name === selected.name })[selected.name];
  } catch {
    throw new Error("Nao foi possivel abrir o ZIP. Verifique se esta corrompido ou protegido por senha.");
  }
  if (!content?.length) throw new Error("O arquivo de treino dentro do ZIP esta vazio.");
  if (content.length > 20 * 1024 * 1024) throw new Error("O treino dentro do ZIP excede o limite de 20 MB.");
  const extension = selected.name.split(".").at(-1)!.toLowerCase();
  if (extension === "fit") return parseFit(Uint8Array.from(content).buffer);
  return parseXml(strFromU8(content), extension.toUpperCase() as "GPX" | "TCX");
}

export async function importWorkout(file: File): Promise<WorkoutSummary> {
  if (!file.size) throw new Error("O arquivo está vazio.");
  if (file.size > 20 * 1024 * 1024) throw new Error("Selecione um arquivo de até 20 MB.");
  const extension = file.name.split(".").at(-1)?.toLowerCase();
  if (extension === "fit") return parseFit(await file.arrayBuffer());
  if (extension === "gpx" || extension === "tcx") return parseXml(await file.text(), extension.toUpperCase() as "GPX" | "TCX");
  if (extension === "zip") return parseZip(await file.arrayBuffer());
  throw new Error("Formato não suportado. Selecione um arquivo ZIP, GPX, TCX ou FIT.");
}
