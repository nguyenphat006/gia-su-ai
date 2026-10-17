/**
 * Trạng thái một trận đấu (dùng chung đấu AI và PvP) — hàm thuần, dễ test.
 *
 * answering --answer--> waiting --(AI: aiOutcome | PvP: answerResult + scores)--> reveal --next--> answering … -> done
 */
import type { AiAnswerOutcome, ArenaQuestion } from "../shared/types";

export type BattlePhase = "answering" | "waiting" | "reveal" | "done";

export interface MyOutcome {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
  timeLeft: number;
  points: number | null;
}

export interface OpponentOutcome {
  isCorrect: boolean;
  timeLeft: number;
  points: number;
}

export interface BattleState {
  matchId: number;
  topic: string;
  secondsPerQuestion: number;
  questions: ArenaQuestion[];
  opponentName: string;
  index: number;
  phase: BattlePhase;
  myAnswer: string | null;
  mine: MyOutcome | null;
  opponent: OpponentOutcome | null;
  myScore: number;
  opponentScore: number;
  /** Số câu đúng của mình (hiển thị) */
  myCorrect: number;
}

export interface BattleInit {
  match_id: number;
  topic: string;
  seconds_per_question: number;
  questions: ArenaQuestion[];
  opponentName: string;
}

export interface AnswerResultPayload {
  question_index: number;
  is_correct: boolean;
  correct_answer: string;
  explanation: string;
  time_left: number;
  points: number | null;
}

export type BattleAction =
  | { type: "answer"; answer: string }
  | { type: "answerFailed" }
  | { type: "aiOutcome"; outcome: AiAnswerOutcome }
  | { type: "answerResult"; result: AnswerResultPayload }
  | { type: "scores"; scores: Record<string, number>; myUserId: number }
  | { type: "next" }
  | { type: "finish" };

export function createBattle(init: BattleInit): BattleState {
  const questions = [...init.questions].sort((a, b) => a.index - b.index);
  return {
    matchId: init.match_id,
    topic: init.topic,
    secondsPerQuestion: init.seconds_per_question > 0 ? init.seconds_per_question : 30,
    questions,
    opponentName: init.opponentName,
    index: 0,
    phase: questions.length ? "answering" : "done",
    myAnswer: null,
    mine: null,
    opponent: null,
    myScore: 0,
    opponentScore: 0,
    myCorrect: 0,
  };
}

export const currentQuestion = (s: BattleState): ArenaQuestion | undefined => s.questions[s.index];
export const isLastQuestion = (s: BattleState): boolean => s.index >= s.questions.length - 1;

function toMine(r: AnswerResultPayload): MyOutcome {
  return { isCorrect: r.is_correct, correctAnswer: r.correct_answer, explanation: r.explanation, timeLeft: r.time_left, points: r.points };
}

export function battleReducer(state: BattleState, action: BattleAction): BattleState {
  switch (action.type) {
    case "answer":
      if (state.phase !== "answering") return state;
      return { ...state, phase: "waiting", myAnswer: action.answer };
    case "answerFailed":
      if (state.phase !== "waiting" || state.mine) return state;
      return { ...state, phase: "answering", myAnswer: null };
    case "aiOutcome": {
      const { result, opponent_move: move, my_score, opponent_score } = action.outcome;
      if (result.question_index !== state.index) return state;
      return {
        ...state,
        phase: "reveal",
        mine: toMine(result),
        opponent: move ? { isCorrect: move.is_correct, timeLeft: move.time_left, points: move.points } : null,
        myScore: my_score,
        opponentScore: opponent_score,
        myCorrect: state.myCorrect + (result.is_correct ? 1 : 0),
      };
    }
    case "answerResult": {
      // PvP: kết quả của mình; điểm chỉ có khi cả hai đã trả lời (match.scores)
      if (action.result.question_index !== state.index || state.mine) return state;
      return { ...state, mine: toMine(action.result), myCorrect: state.myCorrect + (action.result.is_correct ? 1 : 0) };
    }
    case "scores": {
      const mineKey = String(action.myUserId);
      const myScore = action.scores[mineKey] ?? state.myScore;
      const other = Object.entries(action.scores).find(([k]) => k !== mineKey);
      const opponentScore = other ? other[1] : state.opponentScore;
      // Đã có kết quả của mình cho câu đang chờ -> chuyển sang xem đáp án
      const phase = state.phase === "waiting" && state.mine ? "reveal" : state.phase;
      return { ...state, myScore, opponentScore, phase };
    }
    case "next": {
      if (state.phase !== "reveal") return state;
      if (isLastQuestion(state)) return { ...state, phase: "done" };
      return { ...state, index: state.index + 1, phase: "answering", myAnswer: null, mine: null, opponent: null };
    }
    case "finish":
      return { ...state, phase: "done" };
    default:
      return state;
  }
}
