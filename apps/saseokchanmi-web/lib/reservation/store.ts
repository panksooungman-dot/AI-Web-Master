import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { ReservationInput, ReservationRecord } from "./types";

const DATA_DIR = path.join(process.cwd(), "lib", "data");
const DATA_FILE = path.join(DATA_DIR, "reservations.json");

function readAll(): ReservationRecord[] {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** 예약 문의를 로컬 JSON에 append 저장한다(machine-local, `.gitignore` 처리됨). */
export function saveReservation(input: ReservationInput): ReservationRecord {
  const record: ReservationRecord = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    name: input.name.trim(),
    phone: input.phone.trim(),
    visitDate: input.visitDate.trim(),
    visitTime: input.visitTime.trim(),
    partySize: input.partySize.trim(),
    message: input.message?.trim() ?? "",
  };

  const all = readAll();
  all.push(record);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(all, null, 2), "utf-8");

  return record;
}
