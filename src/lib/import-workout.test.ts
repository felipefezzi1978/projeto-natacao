// @vitest-environment jsdom
import { zipSync, strToU8 } from "fflate";
import { describe, it, expect } from "vitest";
import { Encoder, Profile, type FileIdMesg, type SessionMesg } from "@garmin/fitsdk";
import { parseFit, parseXml, parseZip, importWorkout } from "./import-workout";

describe("importação Garmin", () => {
  it("calcula distância GPS, duração, ritmo e FC com namespace Garmin", () => {
    const result = parseXml(`<gpx xmlns="http://www.topografix.com/GPX/1/1" xmlns:h="urn:garmin"><trk><trkseg><trkpt lat="0" lon="0"><time>2026-01-01T10:00:00Z</time><extensions><h:hr>120</h:hr></extensions></trkpt><trkpt lat="0" lon="0.001"><time>2026-01-01T10:02:00Z</time><extensions><h:hr>140</h:hr></extensions></trkpt></trkseg></trk></gpx>`, "GPX");
    expect(result.distanceKm).toBeCloseTo(0.111, 3);
    expect(result.durationMinutes).toBe(2);
    expect(result.avgPace).toBe("1:48 /100m");
    expect(result.avgHeartRate).toBe(130);
  });
  it("não liga segmentos GPS separados", () => {
    const result = parseXml('<gpx><trk><trkseg><trkpt lat="0" lon="0"/></trkseg><trkseg><trkpt lat="10" lon="10"/></trkseg></trk></gpx>', 'GPX');
    expect(result.distanceKm).toBe(0);
    expect(result.avgPace).toBe('—');
  });
  it("usa totais das voltas TCX de piscina sem GPS", () => {
    const result = parseXml('<TrainingCenterDatabase><Activities><Activity><Lap StartTime="2026-01-01T10:00:00Z"><TotalTimeSeconds>120</TotalTimeSeconds><DistanceMeters>100</DistanceMeters></Lap><Lap><TotalTimeSeconds>130</TotalTimeSeconds><DistanceMeters>100</DistanceMeters></Lap></Activity></Activities></TrainingCenterDatabase>', 'TCX');
    expect(result.distanceKm).toBe(0.2);
    expect(result.durationMinutes).toBeCloseTo(250/60);
    expect(result.avgPace).toBe('2:05 /100m');
  });
  it.each(['<gpx>', '<gpx/>', '<html/>'])('rejeita XML inválido ou vazio: %s', xml => {
    expect(() => parseXml(xml, 'GPX')).toThrow();
  });
  it("decodifica FIT binário de piscina usando totais da sessão", async () => {
    const encoder = new Encoder();
    encoder.onMesg(Profile.MesgNum.FILE_ID, { type: 'activity', manufacturer: 'development', timeCreated: new Date('2026-01-01T10:00:00Z') } as FileIdMesg);
    encoder.onMesg(Profile.MesgNum.SESSION, { sport: 'swimming', subSport: 'lapSwimming', startTime: new Date('2026-01-01T10:00:00Z'), timestamp: new Date('2026-01-01T10:22:00Z'), totalTimerTime: 1200, totalElapsedTime: 1320, totalDistance: 1000, avgHeartRate: 135 } as SessionMesg);
    const bytes = encoder.close();
    const result = await parseFit(Uint8Array.from(bytes).buffer);
    expect(result.distanceKm).toBe(1);
    expect(result.durationMinutes).toBe(20);
    expect(result.avgPace).toBe('2:00 /100m');
    expect(result.avgHeartRate).toBe(135);
    const zipped = zipSync({ "activity/123.FIT": bytes });
    expect(await parseZip(Uint8Array.from(zipped).buffer)).toEqual(result);
    bytes[bytes.length - 1] ^= 255;
    await expect(parseFit(Uint8Array.from(bytes).buffer)).rejects.toThrow();
  });
  it("rejeita FIT inválido", async () => {
    await expect(parseFit(new ArrayBuffer(20))).rejects.toThrow();
  });
  it("rejeita arquivo vazio", async () => {
    await expect(importWorkout(new File([], 'treino.gpx'))).rejects.toThrow('vazio');
  });
});

const zipBuffer = (files: Record<string, Uint8Array>) => Uint8Array.from(zipSync(files)).buffer;
describe("ZIP Garmin", () => {
  const gpx = strToU8('<gpx><trk><trkseg><trkpt lat="0" lon="0"/></trkseg></trk></gpx>');
  it("importa GPX em subpasta e ignora metadados", async () => {
    const buffer = zipBuffer({ 'folder/ACTIVITY.GPX': gpx, '__MACOSX/._activity.gpx': gpx, 'readme.txt': strToU8('info') });
    expect((await parseZip(buffer)).source).toBe('GPX');
    const file = { name: 'garmin.ZIP', size: buffer.byteLength, arrayBuffer: async () => buffer } as File;
    expect((await importWorkout(file)).source).toBe('GPX');
  });
  it("importa TCX compactado", async () => {
    const tcx = strToU8('<TrainingCenterDatabase><Activities><Activity><Lap><TotalTimeSeconds>120</TotalTimeSeconds><DistanceMeters>100</DistanceMeters></Lap></Activity></Activities></TrainingCenterDatabase>');
    expect((await parseZip(zipBuffer({ 'activity.tcx': tcx }))).avgPace).toBe('2:00 /100m');
  });
  it("rejeita ZIP invalido", async () => {
    await expect(parseZip(new ArrayBuffer(10))).rejects.toThrow('corrompido');
  });
  it("rejeita ZIP sem treino", async () => {
    await expect(parseZip(zipBuffer({ 'readme.txt': gpx }))).rejects.toThrow('nao contem');
  });
  it("nao escolhe silenciosamente entre varios treinos", async () => {
    await expect(parseZip(zipBuffer({ 'a.gpx': gpx, 'b.gpx': gpx }))).rejects.toThrow('varios treinos');
  });
  it("rejeita treino vazio", async () => {
    await expect(parseZip(zipBuffer({ 'a.fit': new Uint8Array() }))).rejects.toThrow('vazio');
  });
  it("limita o tamanho descompactado", async () => {
    await expect(parseZip(zipBuffer({ 'a.fit': new Uint8Array(20 * 1024 * 1024 + 1) }))).rejects.toThrow('20 MB');
  });
});
