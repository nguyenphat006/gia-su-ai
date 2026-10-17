"use client";

/**
 * Kết nối WebSocket đấu trường (một kết nối cho cả trang) + store Zustand giữ trạng thái sảnh / trận.
 * - Đóng mã 4401 (token hết hạn) -> làm mới token qua axiosClient rồi nối lại 1 lần.
 * - Đóng mã 4403 -> không có quyền, không nối lại.
 * - Mất kết nối khác -> nối lại với độ trễ tăng dần (1s, 2s, 4s … tối đa 30s, 6 lần).
 */
import { create } from "zustand";
import { authService } from "@/modules/auth/services/auth.service";
import { arenaSocketUrl } from "../shared/apiUrls";
import { battleReducer, type BattleAction } from "./battleReducer";
import { applyServerMessage, INITIAL_LOBBY, isServerMessage, pruneExpired, type ClientMessage, type LobbyState, type ServerMessage } from "./arenaLobby";

export type SocketStatus = "idle" | "connecting" | "open" | "reconnecting" | "closed" | "forbidden" | "unauthorized";

interface ArenaStore extends LobbyState {
  status: SocketStatus;
  /** Mất kết nối giữa trận (server đã xử thua) */
  lostMatch: boolean;
  dispatchBattle: (action: BattleAction) => void;
  patch: (p: Partial<ArenaStore>) => void;
  reset: () => void;
}

export const useArenaStore = create<ArenaStore>((set) => ({
  ...INITIAL_LOBBY,
  status: "idle",
  lostMatch: false,
  dispatchBattle: (action) => set((s) => (s.battle ? { battle: battleReducer(s.battle, action) } : {})),
  patch: (p) => set(p),
  reset: () => set({ ...INITIAL_LOBBY, status: "idle", lostMatch: false }),
}));

type Listener = (msg: ServerMessage) => void;

const MAX_RETRIES = 6;
const CLOSE_UNAUTHORIZED = 4401;
const CLOSE_FORBIDDEN = 4403;

class ArenaSocketClient {
  private ws: WebSocket | null = null;
  private manual = false;
  private retries = 0;
  private refreshTried = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<Listener>();
  private myUserId = 0;

  /** Đăng ký nghe tin nhắn server (hiện thông báo…) — trả hàm hủy */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  connect(myUserId: number) {
    this.myUserId = myUserId;
    this.manual = false;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this.open();
  }

  disconnect() {
    this.manual = true;
    this.clearRetry();
    const ws = this.ws;
    this.ws = null;
    if (ws && ws.readyState <= WebSocket.OPEN) ws.close(1000);
    useArenaStore.getState().reset();
  }

  send(msg: ClientMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(msg));
    return true;
  }

  /** Bỏ lời mời quá hạn (gọi định kỳ từ giao diện) */
  prune() {
    const s = useArenaStore.getState();
    const next = pruneExpired(s, Date.now());
    if (next !== s) useArenaStore.setState({ incoming: next.incoming, outgoing: next.outgoing });
  }

  private open() {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!token) {
      useArenaStore.setState({ status: "unauthorized" });
      return;
    }
    useArenaStore.setState({ status: this.retries > 0 ? "reconnecting" : "connecting" });
    let ws: WebSocket;
    try {
      ws = new WebSocket(arenaSocketUrl(token));
    } catch {
      this.scheduleRetry();
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      if (this.ws !== ws) return;
      this.retries = 0;
      this.refreshTried = false;
      useArenaStore.setState({ status: "open" });
    };
    ws.onmessage = (event) => {
      if (this.ws !== ws) return;
      let data: unknown;
      try {
        data = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (!isServerMessage(data)) return;
      const current = useArenaStore.getState();
      const next = applyServerMessage(current, data, { myUserId: this.myUserId, now: Date.now() });
      if (next !== current) {
        const { players, playersLoaded, incoming, outgoing, queue, battle, opponentUserId, finished } = next;
        useArenaStore.setState({ players, playersLoaded, incoming, outgoing, queue, battle, opponentUserId, finished });
      }
      this.listeners.forEach((l) => l(data));
    };
    ws.onclose = (event) => {
      if (this.ws !== ws) return;
      this.ws = null;
      const s = useArenaStore.getState();
      // Mất kết nối giữa trận -> server xử thua; đưa giao diện về sảnh
      const inMatch = Boolean(s.battle && !s.finished);
      useArenaStore.setState({
        queue: "idle",
        outgoing: null,
        incoming: [],
        ...(inMatch ? { battle: null, lostMatch: true } : {}),
      });
      if (this.manual) return;
      if (event.code === CLOSE_FORBIDDEN) {
        useArenaStore.setState({ status: "forbidden" });
        return;
      }
      if (event.code === CLOSE_UNAUTHORIZED) {
        if (this.refreshTried) {
          useArenaStore.setState({ status: "unauthorized" });
          return;
        }
        this.refreshTried = true;
        useArenaStore.setState({ status: "reconnecting" });
        // Gọi API có xác thực: axiosClient tự làm mới access token khi gặp 401, rồi nối lại bằng token mới
        authService
          .getProfile()
          .then(() => !this.manual && this.open())
          .catch(() => useArenaStore.setState({ status: "unauthorized" }));
        return;
      }
      this.scheduleRetry();
    };
  }

  private scheduleRetry() {
    if (this.manual) return;
    if (this.retries >= MAX_RETRIES) {
      useArenaStore.setState({ status: "closed" });
      return;
    }
    const delay = Math.min(30_000, 1000 * 2 ** this.retries);
    this.retries += 1;
    useArenaStore.setState({ status: "reconnecting" });
    this.clearRetry();
    this.retryTimer = setTimeout(() => this.open(), delay);
  }

  private clearRetry() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  /** Thử nối lại ngay (nút "Kết nối lại") */
  retryNow() {
    this.manual = false;
    this.retries = 0;
    this.refreshTried = false;
    this.clearRetry();
    if (!this.ws) this.open();
  }
}

export const arenaSocket = new ArenaSocketClient();
