import { describe, expect, it } from "vitest";
import { applyServerMessage, INITIAL_LOBBY, pruneExpired, shouldShowResult, CHALLENGE_TTL_MS, type LobbyState } from "./arenaLobby";
import { battleReducer, createBattle, type BattleState } from "./battleReducer";

const questions = [
  { index: 1, content: "Câu 2", options: ["A", "B"], hint: "", difficulty: "NHAN_BIET" },
  { index: 0, content: "Câu 1", options: ["A", "B"], hint: "", difficulty: "NHAN_BIET" },
];

function newBattle(): BattleState {
  return createBattle({ match_id: 7, topic: "Lực", seconds_per_question: 30, questions, opponentName: "AI" });
}

const aiOutcome = (index: number, correct: boolean, my: number, opp: number, done = false) => ({
  question_index: index,
  result: { question_index: index, is_correct: correct, correct_answer: "A", explanation: "", time_left: 20, points: correct ? 30 : 0 },
  opponent_move: { question_index: index, is_correct: true, time_left: 10, points: 20 },
  done,
  my_score: my,
  opponent_score: opp,
});

describe("battleReducer — đấu AI", () => {
  it("sắp câu theo index và chạy hết vòng trả lời -> xem đáp án -> câu tiếp -> xong", () => {
    let s = newBattle();
    expect(s.questions.map((q) => q.content)).toEqual(["Câu 1", "Câu 2"]);
    expect(s.phase).toBe("answering");

    s = battleReducer(s, { type: "answer", answer: "A" });
    expect(s).toMatchObject({ phase: "waiting", myAnswer: "A" });
    // Trả lời lặp khi đang chờ -> bỏ qua
    expect(battleReducer(s, { type: "answer", answer: "B" }).myAnswer).toBe("A");

    s = battleReducer(s, { type: "aiOutcome", outcome: aiOutcome(0, true, 30, 20) });
    expect(s).toMatchObject({ phase: "reveal", myScore: 30, opponentScore: 20, myCorrect: 1 });
    expect(s.opponent).toEqual({ isCorrect: true, timeLeft: 10, points: 20 });

    s = battleReducer(s, { type: "next" });
    expect(s).toMatchObject({ index: 1, phase: "answering", mine: null, opponent: null, myAnswer: null });

    s = battleReducer(battleReducer(s, { type: "answer", answer: "" }), { type: "aiOutcome", outcome: aiOutcome(1, false, 30, 40, true) });
    s = battleReducer(s, { type: "next" });
    expect(s.phase).toBe("done");
  });

  it("bỏ qua kết quả của câu khác; gửi lỗi -> cho chọn lại", () => {
    let s = battleReducer(newBattle(), { type: "answer", answer: "A" });
    expect(battleReducer(s, { type: "aiOutcome", outcome: aiOutcome(1, true, 30, 0) })).toBe(s);
    s = battleReducer(s, { type: "answerFailed" });
    expect(s).toMatchObject({ phase: "answering", myAnswer: null });
  });
});

describe("battleReducer — PvP", () => {
  it("kết quả của mình chưa có điểm -> chờ match.scores rồi mới xem đáp án", () => {
    let s = battleReducer(newBattle(), { type: "answer", answer: "B" });
    s = battleReducer(s, {
      type: "answerResult",
      result: { question_index: 0, is_correct: false, correct_answer: "A", explanation: "Vì…", time_left: 12, points: null },
    });
    expect(s.phase).toBe("waiting");
    expect(s.mine?.correctAnswer).toBe("A");
    s = battleReducer(s, { type: "scores", scores: { "5": 0, "9": 25 }, myUserId: 5 });
    expect(s).toMatchObject({ phase: "reveal", myScore: 0, opponentScore: 25 });
  });
});

describe("applyServerMessage", () => {
  const ctx = { myUserId: 5, now: 1000 };

  it("sảnh: danh sách người chơi, lời mời đến / hủy, ghép trận", () => {
    let s: LobbyState = applyServerMessage(INITIAL_LOBBY, { type: "lobby.players", players: [{ user_id: 9, name: "Lan", grade: 8, class_name: "8A", status: "idle" }] }, ctx);
    expect(s.playersLoaded).toBe(true);
    s = applyServerMessage(s, { type: "challenge.received", challenge_id: "c1", from: { user_id: 9, name: "Lan", grade: 8, class_name: "8A" }, config: { topic: "Lực", count: 5, difficulties: [] } }, ctx);
    expect(s.incoming).toHaveLength(1);
    s = applyServerMessage(s, { type: "challenge.cancelled", challenge_id: "c1" }, ctx);
    expect(s.incoming).toHaveLength(0);
    s = applyServerMessage(s, { type: "queue.waiting" }, ctx);
    expect(s.queue).toBe("waiting");
  });

  it("thách đấu đi: ghi challenge_id khi server xác nhận, xóa khi bị từ chối hoặc lỗi", () => {
    const base: LobbyState = { ...INITIAL_LOBBY, outgoing: { challengeId: null, targetUserId: 9, targetName: "Lan", config: { topic: "", count: 10, difficulties: [] }, sentAt: 0 } };
    expect(applyServerMessage(base, { type: "error", message: "Bận" }, ctx).outgoing).toBeNull();
    const sent = applyServerMessage(base, { type: "challenge.sent", challenge_id: "c2", target_user_id: 9 }, ctx);
    expect(sent.outgoing?.challengeId).toBe("c2");
    expect(applyServerMessage(sent, { type: "error", message: "x" }, ctx).outgoing?.challengeId).toBe("c2");
    expect(applyServerMessage(sent, { type: "challenge.declined", challenge_id: "c2" }, ctx).outgoing).toBeNull();
  });

  it("trận PvP: start -> answer_result -> scores -> finished", () => {
    let s = applyServerMessage(
      { ...INITIAL_LOBBY, queue: "waiting" },
      { type: "match.start", match_id: 3, topic: "Lực", seconds_per_question: 30, questions, opponent: { user_id: 9, name: "Lan" } },
      ctx,
    );
    expect(s.queue).toBe("idle");
    expect(s.battle?.opponentName).toBe("Lan");
    s = { ...s, battle: battleReducer(s.battle as BattleState, { type: "answer", answer: "A" }) };
    s = applyServerMessage(s, { type: "match.answer_result", match_id: 3, question_index: 0, is_correct: true, correct_answer: "A", explanation: "", time_left: 20, points: null }, ctx);
    s = applyServerMessage(s, { type: "match.scores", match_id: 3, scores: { "5": 30, "9": 0 } }, ctx);
    expect(s.battle).toMatchObject({ phase: "reveal", myScore: 30, opponentScore: 0 });
    // Tin nhắn của trận khác bị bỏ qua
    expect(applyServerMessage(s, { type: "match.scores", match_id: 99, scores: { "5": 0 } }, ctx)).toBe(s);

    s = applyServerMessage(s, { type: "match.finished", match_id: 3, status: "FINISHED", forfeit_user_id: null, participants: [] }, ctx);
    expect(s.finished?.match_id).toBe(3);
    // Đang xem đáp án câu 1 (chưa hết câu) và không ai bỏ cuộc -> chưa hiện kết quả
    expect(shouldShowResult(s)).toBe(false);
    expect(shouldShowResult({ ...s, finished: { ...s.finished!, forfeit_user_id: 9 } })).toBe(true);
  });

  it("lời mời quá 2 phút bị dọn", () => {
    const s: LobbyState = {
      ...INITIAL_LOBBY,
      incoming: [{ challengeId: "c", from: { user_id: 1, name: "A", grade: null, class_name: null }, config: { topic: "", count: 5, difficulties: [] }, receivedAt: 0 }],
    };
    expect(pruneExpired(s, CHALLENGE_TTL_MS - 1)).toBe(s);
    expect(pruneExpired(s, CHALLENGE_TTL_MS).incoming).toHaveLength(0);
  });
});
