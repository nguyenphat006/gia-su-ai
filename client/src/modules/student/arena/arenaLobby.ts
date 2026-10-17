/**
 * Trạng thái sảnh PvP + trận đang đấu, cập nhật theo tin nhắn WebSocket (hàm thuần, xem consumers.py ở backend).
 */
import type { ArenaQuestion, Difficulty } from "../shared/types";
import { battleReducer, createBattle, type BattleAction, type BattleState } from "./battleReducer";

export type PlayerStatus = "idle" | "matching" | "in-battle";

export interface LobbyPlayer {
  user_id: number;
  name: string;
  grade: number | null;
  class_name: string | null;
  status: PlayerStatus;
}

export interface ChallengeConfig {
  topic: string;
  count: number;
  difficulties: Difficulty[];
}

export interface PlayerInfo {
  user_id: number;
  name: string;
  grade: number | null;
  class_name: string | null;
}

export interface IncomingChallenge {
  challengeId: string;
  from: PlayerInfo;
  config: ChallengeConfig;
  receivedAt: number;
}

export interface OutgoingChallenge {
  challengeId: string | null;
  targetUserId: number;
  targetName: string;
  config: ChallengeConfig;
  sentAt: number;
}

export interface PvpParticipant {
  user_id: number | null;
  score: number;
  correct_count: number;
  is_winner: boolean;
  xp_earned: number;
}

export interface PvpFinished {
  match_id: number;
  status: string;
  forfeit_user_id: number | null;
  participants: PvpParticipant[];
}

export type ServerMessage =
  | { type: "lobby.players"; players: LobbyPlayer[] }
  | { type: "challenge.received"; challenge_id: string; from: PlayerInfo; config: ChallengeConfig }
  | { type: "challenge.sent"; challenge_id: string; target_user_id: number }
  | { type: "challenge.declined"; challenge_id: string; by?: PlayerInfo }
  | { type: "challenge.cancelled"; challenge_id: string }
  | { type: "queue.waiting" }
  | { type: "queue.left" }
  | {
      type: "match.start";
      match_id: number;
      topic: string;
      seconds_per_question: number;
      questions: ArenaQuestion[];
      opponent: { user_id: number; name: string };
    }
  | {
      type: "match.answer_result";
      match_id: number;
      question_index: number;
      is_correct: boolean;
      correct_answer: string;
      explanation: string;
      time_left: number;
      points: number | null;
    }
  | { type: "match.scores"; match_id: number; scores: Record<string, number> }
  | ({ type: "match.finished" } & PvpFinished)
  | { type: "error"; message: string };

export type ClientMessage =
  | { type: "lobby.list"; grade?: number }
  | { type: "challenge.send"; target_user_id: number; config: ChallengeConfig }
  | { type: "challenge.respond"; challenge_id: string; accept: boolean }
  | { type: "challenge.cancel"; challenge_id: string }
  | { type: "queue.join"; same_grade: boolean }
  | { type: "queue.leave" }
  | { type: "match.answer"; match_id: number; question_index: number; answer: string }
  | { type: "match.leave"; match_id: number };

export interface LobbyState {
  players: LobbyPlayer[];
  playersLoaded: boolean;
  incoming: IncomingChallenge[];
  outgoing: OutgoingChallenge | null;
  queue: "idle" | "waiting";
  battle: BattleState | null;
  opponentUserId: number | null;
  finished: PvpFinished | null;
}

export const INITIAL_LOBBY: LobbyState = {
  players: [],
  playersLoaded: false,
  incoming: [],
  outgoing: null,
  queue: "idle",
  battle: null,
  opponentUserId: null,
  finished: null,
};

/** Lời mời thách đấu hết hạn sau 2 phút (khớp lobby ở server) */
export const CHALLENGE_TTL_MS = 2 * 60_000;

export function isServerMessage(value: unknown): value is ServerMessage {
  return typeof value === "object" && value !== null && typeof (value as { type?: unknown }).type === "string";
}

function onBattle(state: LobbyState, matchId: number, action: BattleAction): LobbyState {
  if (!state.battle || state.battle.matchId !== matchId) return state;
  return { ...state, battle: battleReducer(state.battle, action) };
}

/** Áp một tin nhắn server vào trạng thái sảnh */
export function applyServerMessage(state: LobbyState, msg: ServerMessage, ctx: { myUserId: number; now: number }): LobbyState {
  switch (msg.type) {
    case "lobby.players":
      return { ...state, players: Array.isArray(msg.players) ? msg.players : [], playersLoaded: true };
    case "challenge.received": {
      const incoming = state.incoming.filter((c) => c.challengeId !== msg.challenge_id && c.from.user_id !== msg.from.user_id);
      return { ...state, incoming: [...incoming, { challengeId: msg.challenge_id, from: msg.from, config: msg.config, receivedAt: ctx.now }] };
    }
    case "challenge.sent":
      if (!state.outgoing || state.outgoing.targetUserId !== msg.target_user_id) return state;
      return { ...state, outgoing: { ...state.outgoing, challengeId: msg.challenge_id } };
    case "challenge.declined":
      if (!state.outgoing || (state.outgoing.challengeId && state.outgoing.challengeId !== msg.challenge_id)) return state;
      return { ...state, outgoing: null };
    case "challenge.cancelled":
      return { ...state, incoming: state.incoming.filter((c) => c.challengeId !== msg.challenge_id) };
    case "queue.waiting":
      return { ...state, queue: "waiting" };
    case "queue.left":
      return { ...state, queue: "idle" };
    case "match.start":
      return {
        ...state,
        queue: "idle",
        outgoing: null,
        incoming: [],
        finished: null,
        opponentUserId: msg.opponent?.user_id ?? null,
        battle: createBattle({ ...msg, opponentName: msg.opponent?.name ?? "" }),
      };
    case "match.answer_result":
      return onBattle(state, msg.match_id, { type: "answerResult", result: msg });
    case "match.scores":
      return onBattle(state, msg.match_id, { type: "scores", scores: msg.scores ?? {}, myUserId: ctx.myUserId });
    case "match.finished": {
      if (state.battle && state.battle.matchId !== msg.match_id) return state;
      const { match_id, status, forfeit_user_id, participants } = msg;
      return { ...state, finished: { match_id, status, forfeit_user_id: forfeit_user_id ?? null, participants: participants ?? [] } };
    }
    case "error":
      // Lời thách chưa được server nhận (đối thủ bận / không hợp lệ) -> bỏ trạng thái chờ
      return state.outgoing && !state.outgoing.challengeId ? { ...state, outgoing: null } : state;
    default:
      return state;
  }
}

/** Bỏ lời mời đã quá hạn */
export function pruneExpired(state: LobbyState, now: number): LobbyState {
  const incoming = state.incoming.filter((c) => now - c.receivedAt < CHALLENGE_TTL_MS);
  const outgoingExpired = state.outgoing && now - state.outgoing.sentAt >= CHALLENGE_TTL_MS;
  if (incoming.length === state.incoming.length && !outgoingExpired) return state;
  return { ...state, incoming, outgoing: outgoingExpired ? null : state.outgoing };
}

/** Kết quả trận nên hiện chưa: đã xem xong câu cuối, hoặc có người bỏ cuộc */
export function shouldShowResult(state: LobbyState): boolean {
  if (!state.finished) return false;
  return !state.battle || state.battle.phase === "done" || state.finished.forfeit_user_id != null;
}
