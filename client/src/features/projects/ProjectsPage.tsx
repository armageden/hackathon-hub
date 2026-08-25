import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Trophy } from "lucide-react";
import { useEventRole } from "@/hooks/useEventRole";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import type { ProjectSubmission, CreateProjectRequest } from "@/types/api";
import * as projectsApi from "./projects.api";
import { formatDateTime } from "@/lib/formatters";
import { useScopedEventId } from "@/app/providers";

interface Message {
  type: "success" | "error";
  text: string;
}

export default function ProjectsPage() {
  const EVENT_ID = useScopedEventId();
  const { isOrganizer, isParticipant } = useEventRole(EVENT_ID);

  const [projects, setProjects] = useState<ProjectSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message | null>(null);
  const [dqTarget, setDqTarget] = useState<ProjectSubmission | null>(null);

  // One live submission per team is enforced server-side; the form edits that
  // draft when it exists and creates one otherwise.
  const mine = projects.find((p) => p.is_own);
  const editingDraft = mine?.status === "draft" ? mine : null;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProjects(await projectsApi.listProjects(EVENT_ID));
      setMessage(null);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load projects",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Prefill the form whenever the team's own project changes identity
  // (initial load, create, submit) so stale edits never overwrite server state.
  useEffect(() => {
    if (editingDraft) {
      setTitle(editingDraft.title);
      setDescription(editingDraft.description ?? "");
      setRepoUrl(editingDraft.repo_url ?? "");
      setDemoUrl(editingDraft.demo_url ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingDraft?.id]);

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const payload: CreateProjectRequest = {
        title: title.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(repoUrl.trim() ? { repo_url: repoUrl.trim() } : {}),
        ...(demoUrl.trim() ? { demo_url: demoUrl.trim() } : {}),
      };
      if (editingDraft) {
        await projectsApi.updateProject(EVENT_ID, editingDraft.id, payload);
        setMessage({ type: "success", text: "Draft saved" });
      } else {
        await projectsApi.createProject(EVENT_ID, payload);
        setMessage({ type: "success", text: "Project draft created" });
      }
      await load();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save project",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitFinal = async () => {
    if (!editingDraft) return;
    setSubmitting(true);
    try {
      await projectsApi.submitProject(EVENT_ID, editingDraft.id);
      setMessage({ type: "success", text: "Project submitted for judging" });
      await load();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to submit project",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisqualify = async (project: ProjectSubmission) => {
    try {
      await projectsApi.disqualifyProject(EVENT_ID, project.id);
      setMessage({ type: "success", text: `"${project.title}" disqualified` });
      setDqTarget(null);
      await load();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to disqualify project",
      });
    }
  };

  const submitted = projects.filter((p) => p.status !== "draft");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-sm text-gray-400 mt-1">
            Submit your team&apos;s project and track every entry in the event.
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

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-gray-400">Loading projects...</div>
        </div>
      ) : (
        <>
          {isParticipant && (
            <MySubmissionPanel
              mine={mine}
              title={title}
              description={description}
              repoUrl={repoUrl}
              demoUrl={demoUrl}
              saving={saving}
              submitting={submitting}
              onTitleChange={setTitle}
              onDescriptionChange={setDescription}
              onRepoUrlChange={setRepoUrl}
              onDemoUrlChange={setDemoUrl}
              onSaveDraft={handleSaveDraft}
              onSubmitFinal={handleSubmitFinal}
            />
          )}

          <section className="space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-gray-400">
              All Submissions ({submitted.length})
            </h2>
            <div className="card overflow-hidden">
              {submitted.length === 0 ? (
                <div className="p-10 text-center text-gray-400">
                  <Trophy className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  No submissions yet.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-900 border-b border-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-400">Title</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-400">Team</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-400">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-400">Submitted</th>
                      {isOrganizer && <th className="px-4 py-3" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {submitted.map((project) => (
                      <tr key={project.id} className="hover:bg-gray-900/50">
                        <td className="px-4 py-3 text-white">
                          <div>{project.title}</div>
                          {(project.repo_url || project.demo_url) && (
                            <div className="flex gap-3 mt-0.5">
                              {project.repo_url && (
                                <a href={project.repo_url} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300">
                                  Repository
                                </a>
                              )}
                              {project.demo_url && (
                                <a href={project.demo_url} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300">
                                  Demo
                                </a>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-300">{project.team_name}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={project.status} />
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {project.submitted_at ? formatDateTime(project.submitted_at) : "—"}
                        </td>
                        {isOrganizer && (
                          <td className="px-4 py-3 text-right">
                            {project.status === "submitted" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300"
                                onClick={() => setDqTarget(project)}
                              >
                                Disqualify
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </>
      )}

      <Dialog open={dqTarget !== null} onOpenChange={(open) => !open && setDqTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disqualify “{dqTarget?.title}”?</DialogTitle>
            <DialogDescription>
              The team will see that their project was disqualified and will be able to start a
              new submission. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDqTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => dqTarget && handleDisqualify(dqTarget)}
            >
              Disqualify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface MySubmissionPanelProps {
  mine?: ProjectSubmission;
  title: string;
  description: string;
  repoUrl: string;
  demoUrl: string;
  saving: boolean;
  submitting: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onRepoUrlChange: (value: string) => void;
  onDemoUrlChange: (value: string) => void;
  onSaveDraft: () => void;
  onSubmitFinal: () => void;
}

function MySubmissionPanel(props: MySubmissionPanelProps) {
  const { mine } = props;
  const isDraft = mine?.status === "draft";
  const isDisqualified = mine?.status === "disqualified";

  if (mine && mine.status === "submitted") {
    return (
      <section className="card p-6 space-y-3" data-testid="my-submission">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">{mine.title}</h2>
          <StatusBadge status={mine.status} />
        </div>
        {mine.description && <p className="text-sm text-gray-300">{mine.description}</p>}
        <div className="flex gap-4 text-sm">
          {mine.repo_url && (
            <a href={mine.repo_url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300">
              Repository
            </a>
          )}
          {mine.demo_url && (
            <a href={mine.demo_url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300">
              Demo
            </a>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Submitted for judging — edits are locked.
        </p>
      </section>
    );
  }

  return (
    <section className="card p-6 space-y-4" data-testid="my-submission-form">
      {isDisqualified && (
        <div className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          “{mine?.title}” was disqualified by an organizer. You can start a new submission below.
        </div>
      )}
      <div>
        <h2 className="font-semibold text-white">
          {isDraft ? "Edit Your Submission" : isDisqualified ? "Start a New Submission" : "Submit Your Project"}
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Save as a draft while you work, then submit the final version for judging.
        </p>
      </div>
      <div>
        <label className="block text-sm text-gray-300 mb-1">Title</label>
        <Input
          value={props.title}
          onChange={(e) => props.onTitleChange(e.target.value)}
          placeholder="e.g. Autonomous Robot Arm"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-300 mb-1">Description</label>
        <Textarea
          value={props.description}
          onChange={(e) => props.onDescriptionChange(e.target.value)}
          placeholder="What does your project do?"
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">Repository link</label>
          <Input
            value={props.repoUrl}
            onChange={(e) => props.onRepoUrlChange(e.target.value)}
            placeholder="https://github.com/team/project"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">Demo link</label>
          <Input
            value={props.demoUrl}
            onChange={(e) => props.onDemoUrlChange(e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button onClick={props.onSaveDraft} disabled={props.saving || !props.title.trim()}>
          {props.saving ? "Saving..." : isDraft ? "Save Draft" : "Create Draft"}
        </Button>
        {isDraft && (
          <Button onClick={props.onSubmitFinal} disabled={props.submitting || !props.title.trim()}>
            {props.submitting ? "Submitting..." : "Submit Final"}
          </Button>
        )}
      </div>
    </section>
  );
}
