import {
  generateUUID,
  isArray,
  isNumber,
  isPlainObject,
  isStr,
} from '../../src/utils.js';
import type { StorageManager } from '../../src/storageManager.ts';

/**
 * Session metrics derived from local storage, surfaced on the bid request as
 * `user.ext.mgid.*` signals.
 */
export interface MgidSessionInfo {
  /** Current session id (empty string if none). */
  sid: string;
  /** Number of unique pagePaths in the current session (null if absent). */
  sessionPage: number | null;
  /** Count of session starts in the last 7 days. */
  sessionsWeek: number;
  /** Total session starts retained (last 30 days). */
  sessionNum: number;
  /** Minutes between the last two session starts (null if < 2 sessions). */
  timeBetweenSessions: number | null;
}

/**
 * Session / PVID / viewrate facade bound to a Prebid storage manager.
 */
export interface MgidSessionStorage {
  calculatePageSession(): void;
  getSessionInfo(): MgidSessionInfo;
  getOrCreatePvid(): string;
  /** Accumulated "views,renders" viewrate string for the id over 7 days, or null. */
  getViewrate(id: string): string | null;
  trackRender(id: string): void;
  trackView(id: string): void;
  pruneViewrate(): void;
}

/** A single viewrate accumulation row stored under a widget id. */
interface ViewrateRow {
  /** Per-page-load row id. */
  id: string;
  /** Row start time (ms epoch). */
  st: number;
  /** View count. */
  v: number;
  /** Render count. */
  r: number;
}

type ViewrateStore = Record<string, ViewrateRow[]>;

/** Custom globals this facade reads/writes on `window`. */
interface MgidWindow extends Window {
  _mgPbSessionPages?: string[];
  _mgPvidList?: string[];
  _mgPvid?: string;
}

export const SESSION_BOUNDARY_MS = 30 * 60 * 1000; // 30 minutes
export const SESSION_WEEK_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const SESSION_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const LS_KEY_SESSION_ID = '_mgPbSessionId';
const LS_KEY_SESSION_PAGE = '_mgPbSessionPagesNumber';
const LS_KEY_SESSIONS_LIST = '_mgPbSessionsTimeList';
const LS_KEY_VIEWRATE = '_mgPbViewrate';

function mgWin(): MgidWindow {
  return window as unknown as MgidWindow;
}

export function createMgidSessionStorage(storage: StorageManager): MgidSessionStorage {
  const currentViewrateId = Date.now().toString(16);

  function getLocal(key: string): string | null {
    try {
      return storage.getDataFromLocalStorage(key);
    } catch (e) {
      return null;
    }
  }

  function setLocal(key: string, val: string): void {
    try {
      storage.setDataInLocalStorage(key, val);
    } catch (e) {}
  }

  function readPagePaths(): string[] {
    const pages = mgWin()._mgPbSessionPages;
    if (isArray(pages)) {
      return [...pages!];
    }
    return [];
  }

  function writePagePaths(paths: string[]): void {
    mgWin()._mgPbSessionPages = paths;
  }

  function getPagePath(): string {
    try {
      return (window.location && window.location.pathname) || '';
    } catch (e) {
      return '';
    }
  }

  function generateSessionId(): string {
    const rand = generateUUID().replace(/-/g, '').slice(0, 5);
    return Math.round(Date.now() / 1000).toString(16) + '-' + rand;
  }

  function getOrCreatePvid(): string {
    const win = mgWin();
    const pagePath = getPagePath();
    if (!isArray(win._mgPvidList)) {
      win._mgPvidList = [];
    }
    const pathSeen = win._mgPvidList!.indexOf(pagePath) !== -1;
    const pvidMissing = !isStr(win._mgPvid) || win._mgPvid!.length === 0;
    if (!pathSeen || pvidMissing) {
      win._mgPvid = generateUUID();
      if (!pathSeen) {
        win._mgPvidList!.push(pagePath);
      }
    }
    return win._mgPvid || '';
  }

  function calculatePageSession(): void {
    const pagePath = getPagePath();

    const now = Date.now();

    let list: number[] = [];
    try {
      const raw = JSON.parse(getLocal(LS_KEY_SESSIONS_LIST) || '[]');
      if (isArray(raw)) {
        list = raw.filter((t) => isNumber(t) && (now - t) < SESSION_EXPIRATION_MS);
      }
    } catch (e) {}

    let sessionPage = parseInt(getLocal(LS_KEY_SESSION_PAGE) || '', 10);
    if (isNaN(sessionPage) || sessionPage < 0) {
      sessionPage = 0;
    }

    let pagePaths = readPagePaths();

    const isNewPagePath = pagePaths.indexOf(pagePath) === -1;
    if (isNewPagePath) {
      pagePaths.push(pagePath);
      sessionPage = sessionPage + 1;
    }

    let sessionId = getLocal(LS_KEY_SESSION_ID);
    const withinSession = list.length > 0 && (now - list[list.length - 1]) < SESSION_BOUNDARY_MS;

    if (list.length > 0) {
      if (withinSession) {
        list[list.length - 1] = now;
        if (!isStr(sessionId) || sessionId!.length === 0) {
          sessionId = generateSessionId();
        }
      } else {
        sessionId = generateSessionId();
        list.push(now);
        pagePaths = [pagePath];
        sessionPage = 1;
      }
    } else {
      sessionId = generateSessionId();
      list = [now];
      pagePaths = [pagePath];
      sessionPage = 1;
    }

    writePagePaths(pagePaths);
    setLocal(LS_KEY_SESSION_ID, sessionId!);
    setLocal(LS_KEY_SESSION_PAGE, String(sessionPage));
    setLocal(LS_KEY_SESSIONS_LIST, JSON.stringify(list));
  }

  function getSessionInfo(): MgidSessionInfo {
    const sid = getLocal(LS_KEY_SESSION_ID) || '';
    const sessionPage = parseInt(getLocal(LS_KEY_SESSION_PAGE) || '', 10);
    let sessionsList: number[] = [];
    try {
      const raw = JSON.parse(getLocal(LS_KEY_SESSIONS_LIST) || '[]');
      if (isArray(raw)) {
        sessionsList = raw;
      }
    } catch (e) {}
    const now = Date.now();
    const sessionsWeek = sessionsList.filter((t) => isNumber(t) && (now - t) < SESSION_WEEK_MS).length;
    let timeBetweenSessions: number | null = null;
    if (sessionsList.length >= 2) {
      const last = sessionsList[sessionsList.length - 1];
      const prev = sessionsList[sessionsList.length - 2];
      timeBetweenSessions = Math.floor((last - prev) / 60000);
    }
    let sessionPageOut: number | null = null;
    if (!isNaN(sessionPage) && sessionPage > 0) {
      sessionPageOut = sessionPage;
    }
    return {
      sid,
      sessionPage: sessionPageOut,
      sessionsWeek,
      sessionNum: sessionsList.length,
      timeBetweenSessions,
    };
  }

  function readViewrates(): ViewrateStore {
    try {
      const raw = getLocal(LS_KEY_VIEWRATE);
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw);
      if (!isPlainObject(parsed)) {
        return {};
      }
      return parsed as ViewrateStore;
    } catch (e) {
      return {};
    }
  }

  function filterViewrate(list: ViewrateRow[]): ViewrateRow[] {
    if (!isArray(list)) {
      return [];
    }
    const now = Date.now();
    return list.filter((vr) => isPlainObject(vr) && isNumber(vr.st) && (now - vr.st) < SESSION_WEEK_MS);
  }

  function recordViewrate(id: string, field: 'v' | 'r'): void {
    if (!id) {
      return;
    }
    const all = readViewrates();
    const list = filterViewrate(all[id]);
    let current = list.find((vr) => vr.id === currentViewrateId);
    if (!current) {
      current = { id: currentViewrateId, st: Date.now(), v: 0, r: 0 };
      list.push(current);
    }
    current[field] = (Number(current[field]) || 0) + 1;
    all[id] = list;
    setLocal(LS_KEY_VIEWRATE, JSON.stringify(all));
  }

  /**
   * Accumulated "v,r" viewrate string for the given id over the last 7 days.
   */
  function getViewrate(id: string): string | null {
    if (!id) {
      return null;
    }
    const viewrate = filterViewrate(readViewrates()[id]);
    if (viewrate.length === 0) {
      return null;
    }
    let v = 0;
    let r = 0;
    for (const vr of viewrate) {
      v += Number(vr.v) || 0;
      r += Number(vr.r) || 0;
    }
    return `${v},${r}`;
  }

  function trackRender(id: string): void {
    recordViewrate(id, 'r');
  }

  function trackView(id: string): void {
    recordViewrate(id, 'v');
  }

  function pruneViewrate(): void {
    const all = readViewrates();
    let changed = false;
    const now = Date.now();
    for (const widgetId of Object.keys(all)) {
      const rows = all[widgetId];
      if (!isArray(rows)) {
        delete all[widgetId];
        changed = true;
        continue;
      }
      const kept = rows.filter((vr) => isPlainObject(vr) && isNumber(vr.st) && (now - vr.st) < SESSION_WEEK_MS);
      if (kept.length === 0) {
        delete all[widgetId];
        changed = true;
      } else if (kept.length !== rows.length) {
        all[widgetId] = kept;
        changed = true;
      }
    }
    if (changed) {
      setLocal(LS_KEY_VIEWRATE, JSON.stringify(all));
    }
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('beforeunload', pruneViewrate);
  }

  return {
    calculatePageSession,
    getSessionInfo,
    getOrCreatePvid,
    getViewrate,
    trackRender,
    trackView,
    pruneViewrate,
  };
}
