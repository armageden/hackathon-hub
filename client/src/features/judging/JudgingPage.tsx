import { useCallback, useEffect, useState } from "react";
import { Gavel, RefreshCw } from "lucide-react";
import { useEventRole } from "@/hooks/useEventRole";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import type { ProjectSubmission, LeaderboardEntry } from "@/types/api";
import * as judgingApi from "./judging.api";
import { formatDateTime, formatScore } from "@/lib/formatters";
import { useScopedEventId } from "@/app/providers";

const DIMENSIONS = [
  { key: "score_innovation", label: "Innovation", weight: "30%" },
  { key: "score_technical", label: "Technical", weight: "30%" },
  { key: "score_presentation", label: "Presentation", weight: "20%" },
  { key: "score_usefulness", label: "Impact", weight: "20%" },
] as const;

type DimensionKey = (typeof DIMENSIONS)[number]["key"];

type Tab = "queue" | "leaderboard";

interface Message {
  type: "success" | "error";
  text: string;
}

export default function JudgingPage() {
  const EVENT_ID = useScopedEventId();
  const { isJudge, isOrganizer } = useEventRole(EVENT_ID);
  const canScore = isJudge || isOrganizer;

  // Null until the user picks a tab; role decides the default once loaded.
  const [tab, setTab] = useState<Tab | null>(null);
  const activeTab: Tab = tab ?? (canScore ? "queue" : "leaderboard");

  const [queue, setQueue] = useState<ProjectSubmission[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message | null>(null);

  const [scoringProject, setScoringProject] = useState<ProjectSubmission | null>(null);
  const [scores, setScores] = useState<Record<DimensionKey, string>>({
    score_innovation: "",
    score_technical: "",
    score_presentation: "",
    score_usefulness: "",
  });
  const [feedback, setFeedback] = useState("");
  const [savingScore, setSavingScore] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [board, scorable] = await Promise.all([
        judgingApi.getLeaderboard(EVENT_ID),
        canScore ? judgingApi.listScorableProjects(EVENT_ID) : Promise.resolve(null),
      ]);
      setLeaderboard(board);
      if (scorable) setQueue(scorable);
      setMessage(null);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load judging data",
      });
    } finally {
      setLoading(false);
    }
  }, [canScore]);

  useEffect(() => {
    load();
  }, [load]);

  const openScoreDialog = (project: ProjectSubmission) => {
    setScores({ score_innovation: "", score_technical: "", score_presentation: "", score_usefulness: "" });
    setFeedback("");
    setScoringProject(project);
  };

  const scoresValid = DIMENSIONS.every((d) => {
    const n = Number(scores[d.key]);
    return scores[d.key] !== "" && Number.isFinite(n) && n >= 0 && n <= 100;
  });

  const handleSaveScore = async () => {
    if (!scoringProject || !scoresValid) return;
    setSavingScore(true);
    try {
      await judgingApi.submitScore(EVENT_ID, scoringProject.id, {
        score_innovation: Number(scores.score_innovation),
        score_technical: Number(scores.score_technical),
        score_presentation: Number(scores.score_presentation),
        score_usefulness: Number(scores.score_usefulness),
        ...(feedback.trim() ? { feedback: feedback.trim() } : {}),
      });
      setScoringProject(null);
      setMessage({ type: "success", text: `Score saved for "${scoringProject.title}"` });
      await load();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save score",
      });
    } finally {
      setSavingScore(false);
    }
  };

  const tabs: Array<{ key: Tab; label: string; show: boolean }> = [
    { key: "queue", label: `Score Queue (${queue.length})`, show: canScore },
    { key: "leaderboard", label: "Leaderboard", show: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Judging</h1>
          <p className="text-sm text-gray-400 mt-1">
            Score submitted projects and follow the live leaderboard.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={load} aria-label="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {message && (
        <div
          className={
            message.type === "error"
              ? "rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300"
              : "rounded-lg border border-green-800 bg-green-950/50 px-4 py-3 text-sm text-green-300"
          }
        >
          {message.text}
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-800">
        {tabs
          .filter((t) => t.show)
          .map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === t.key
                  ? "text-white border-b-2 border-indigo-500"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-gray-400">Loading judging data...</div>
        </div>
      ) : activeTab === "queue" ? (
        <div className="card overflow-hidden">
          {queue.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <Gavel className="h-8 w-8 mx-auto mb-3 opacity-50" />
              No projects waiting for judgment.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-900 border-b border-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Title</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Team</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Submitted</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {queue.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-900/50">
                    <td className="px-4 py-3 text-white">{project.title}</td>
                    <td className="px-4 py-3 text-gray-300">{project.team_name}</td>
                    <td className="px-4 py-3 text-gray-300">
                      {project.submitted_at ? formatDateTime(project.submitted_at) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => openScoreDialog(project)}>
                        Score
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <Gavel className="h-8 w-8 mx-auto mb-3 opacity-50" />
          No scores yet — the leaderboard appears once judges start scoring.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 border-b border-gray-800">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Rank</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Team</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Project</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Innovation</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Technical</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Presentation</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Impact</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Total</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Judges</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {leaderboard.map((entry) => {
                const total = formatScore(entry.scores.total);
                return (
                  <tr
                    key={entry.project_submission_id}
                    className={entry.rank <= 3 ? "bg-indigo-950/30" : "hover:bg-gray-900/50"}
                  >
                    <td className="px-4 py-3 font-semibold text-white">
                      {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : entry.rank}
                    </td>
                    <td className="px-4 py-3 text-white">{entry.team_name}</td>
                    <td className="px-4 py-3 text-gray-300">{entry.project_title}</td>
                    <td className={`px-4 py-3 ${formatScore(entry.scores.innovation).color}`}>
                      {formatScore(entry.scores.innovation).text}
                    </td>
                    <td className={`px-4 py-3 ${formatScore(entry.scores.technical).color}`}>
                      {formatScore(entry.scores.technical).text}
                    </td>
                    <td className={`px-4 py-3 ${formatScore(entry.scores.presentation).color}`}>
                      {formatScore(entry.scores.presentation).text}
                    </td>
                    <td className={`px-4 py-3 ${formatScore(entry.scores.usefulness).color}`}>
                      {formatScore(entry.scores.usefulness).text}
                    </td>
                    <td className={`px-4 py-3 font-semibold ${total.color}`}>{total.text}</td>
                    <td className="px-4 py-3 text-gray-300">{entry.judge_count}</td>
                    <td
                      className="px-4 py-3 text-gray-300 max-w-[220px] truncate"
                      title={entry.feedback?.length ? entry.feedback.join("\n— ") : undefined}
                    >
                      {entry.feedback?.length ? entry.feedback.join(" — ") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Score dialog */}
      <Dialog open={scoringProject !== null} onOpenChange={(open) => !open && setScoringProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Score “{scoringProject?.title}”</DialogTitle>
            <DialogDescription>
              Each dimension is scored 0–100. The total is weighted: innovation and technical 30%
              each, presentation and impact 20% each. Scores cannot be edited after submission.
            </DialogDescription>
          </DialogHeader>
          {scoringProject && (scoringProject.description || scoringProject.repo_url || scoringProject.demo_url) && (
            <div className="rounded-lg bg-gray-900/70 border border-gray-800 px-4 py-3 text-sm space-y-1">
              {scoringProject.description && (
                <p className="text-gray-300">{scoringProject.description}</p>
              )}
              <div className="flex gap-4">
                {scoringProject.repo_url && (
                  <a href={scoringProject.repo_url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300">
                    Repository
                  </a>
                )}
                {scoringProject.demo_url && (
                  <a href={scoringProject.demo_url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300">
                    Demo
                  </a>
                )}
              </div>
            </div>
          )}
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              {DIMENSIONS.map((d) => (
                <div key={d.key}>
                  <label className="block text-sm text-gray-300 mb-1">
                    {d.label} <span className="text-gray-500">({d.weight})</span>
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={scores[d.key]}
                    onChange={(e) => setScores({ ...scores, [d.key]: e.target.value })}
                    placeholder="0–100"
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Feedback</label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Optional comments for the team"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setScoringProject(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveScore} disabled={!scoresValid || savingScore}>
              {savingScore ? "Saving..." : "Submit Score"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
