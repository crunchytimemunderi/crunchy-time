import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

const DB_NAME = "crunchy_offline_db";
const DB_VERSION = 1;
const STORE_NAME = "pending_operations";

interface PendingOperation {
  id: string;
  type: "sale" | "expense";
  payload: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueOperation(operation: Omit<PendingOperation, "id" | "timestamp" | "retries">): Promise<string> {
  const id = crypto.randomUUID();
  const entry: PendingOperation = {
    ...operation,
    id,
    timestamp: Date.now(),
    retries: 0,
  };
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(entry);
    req.onsuccess = () => resolve(id);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function getPendingOperations(): Promise<PendingOperation[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function removeOperation(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function clearQueue(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function getPendingCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function syncPendingOperations(): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingOperations();
  if (pending.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const op of pending) {
    try {
      const table = op.type === "sale" ? "sales" : "expenses";
      const { error } = await supabase.from(table).insert(op.payload);
      if (error) throw error;
      await removeOperation(op.id);
      synced++;
    } catch (err) {
      logger.error("Failed to sync operation:", op.id, err);
      const updated: PendingOperation = { ...op, retries: op.retries + 1 };
      if (updated.retries >= 5) {
        await removeOperation(op.id);
        logger.warn("Dropping operation after 5 retries:", op.id);
      } else {
        const db = await openDB();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, "readwrite");
          const store = tx.objectStore(STORE_NAME);
          const req = store.put(updated);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
          tx.oncomplete = () => db.close();
        });
      }
      failed++;
    }
  }

  return { synced, failed };
}
