import { judgingRepository } from "./judging.repository.js";
import { NotFoundError, ValidationError, ConflictError } from "../../middleware/error.middleware.js";

const DIMENSIONS = [
  "score_innovation",
  "score_technical",
  "score_presentation",
  "score_usefulness",
] as const;

type Dims = {
  score_innovation: number;
  score_technical: number;
  score_presentation: number;
  score_usefulness: number;
  feedback?: string;
};

function validateDims(dims: Dims) {
  for (const key of DIMENSIONS) {
    const value = dims[key];
    if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value > 100) {
      throw new ValidationError(`${key} must be a number between 0 and 100`);
    }
  }
  if (dims.feedback !== undefined && dims.feedback !== null && typeof dims.feedback !== "string") {
    throw new ValidationError("Feedback must be text");
  }
}

function computeWeightedTotal(dims: Dims) {
  return (
    Math.round(
      (dims.score_innovation * 0.3 +
        dims.score_technical * 0.3 +
        dims.score_presentation * 0.2 +
        dims.score_usefulness * 0.2) *
        100
    ) / 100
  );
}

export const judgingService = {
  async listScorableProjects(eventId: string) {
    return judgingRepository.listSubmittedProjects(eventId);
  },

  async score(
    eventId: string,
    projectId: string,
    dims: Dims,
    judge: { id: string }
  ) {
    const project = await judgingRepository.findProjectById(eventId, projectId);
    if (!project) throw new NotFoundError("Project not found");

    if (project.status !== "submitted") {
      throw new ConflictError("Project has not been submitted for judging");
    }

    validateDims(dims);

    const existing = await judgingRepository.findByProjectAndJudge(projectId, judge.id);
    if (existing) {
      throw new ConflictError("You have already scored this project");
    }

    // Weighted per project business rule: innovation 30%, technical 30%,
    // presentation 20%, usefulness(impact) 20%.
    const scoreTotal = computeWeightedTotal(dims);

    const inserted = await judgingRepository.insertScore(eventId, projectId, judge.id, {
      score_total: scoreTotal,
      score_innovation: dims.score_innovation,
      score_technical: dims.score_technical,
      score_presentation: dims.score_presentation,
      score_usefulness: dims.score_usefulness,
      feedback: dims.feedback ?? null,
    });
    if (!inserted) throw new NotFoundError("Project not found");
    return inserted;
  },

  async listScores(eventId: string, projectId: string) {
    const project = await judgingRepository.findProjectById(eventId, projectId);
    if (!project) throw new NotFoundError("Project not found");
    return judgingRepository.listScoresForProject(eventId, projectId);
  },

  async updateScore(
    eventId: string,
    scoreId: string,
    dims: Dims,
    _organizer: { id: string }
  ) {
    // PRD: scores are final unless the organizer allows an edit — enforced by
    // the route (organizer-only); the judge's original score stays immutable.
    const existing = await judgingRepository.getScoreById(eventId, scoreId);
    if (!existing) throw new NotFoundError("Score not found");

    validateDims(dims);
    const scoreTotal = computeWeightedTotal(dims);

    const updated = await judgingRepository.updateScore(eventId, scoreId, {
      score_total: scoreTotal,
      score_innovation: dims.score_innovation,
      score_technical: dims.score_technical,
      score_presentation: dims.score_presentation,
      score_usefulness: dims.score_usefulness,
      feedback: dims.feedback ?? null,
    });
    if (!updated) throw new NotFoundError("Score not found");
    return updated;
  },

  async leaderboard(eventId: string) {
    return judgingRepository.getLeaderboard(eventId);
  },
};
