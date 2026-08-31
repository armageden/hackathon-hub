import type { Request, Response, NextFunction } from "express";
import { judgingService } from "./judging.service.js";
import { ValidationError } from "../../middleware/error.middleware.js";
import { p, type AuthRequest } from "../../types/index.js";

export const judgingController = {
  async listScorable(req: Request, res: Response, next: NextFunction) {
    try {
      const eventId = p(req, "eventId");
      if (!eventId) throw new ValidationError("Event ID is required");
      const projects = await judgingService.listScorableProjects(eventId);
      res.json({ success: true, data: { projects } });
    } catch (err) {
      next(err);
    }
  },

  async score(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = p(req, "eventId");
      const projectId = p(req, "projectId");
      if (!eventId || !projectId)
        throw new ValidationError("Event ID and Project ID are required");
      if (!req.user) throw new ValidationError("Authentication required");
      const {
        score_innovation,
        score_technical,
        score_presentation,
        score_usefulness,
        feedback,
      } = req.body;
      const score = await judgingService.score(
        eventId,
        projectId,
        { score_innovation, score_technical, score_presentation, score_usefulness, feedback },
        { id: req.user.id }
      );
      res.status(201).json({ success: true, data: { score } });
    } catch (err) {
      next(err);
    }
  },

  async listScores(req: Request, res: Response, next: NextFunction) {
    try {
      const eventId = p(req, "eventId");
      const projectId = p(req, "projectId");
      if (!eventId || !projectId)
        throw new ValidationError("Event ID and Project ID are required");
      const scores = await judgingService.listScores(eventId, projectId);
      res.json({ success: true, data: { scores } });
    } catch (err) {
      next(err);
    }
  },

  async updateScore(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = p(req, "eventId");
      const scoreId = p(req, "scoreId");
      if (!eventId || !scoreId)
        throw new ValidationError("Event ID and Score ID are required");
      if (!req.user) throw new ValidationError("Authentication required");
      const {
        score_innovation,
        score_technical,
        score_presentation,
        score_usefulness,
        feedback,
      } = req.body;
      const score = await judgingService.updateScore(
        eventId,
        scoreId,
        { score_innovation, score_technical, score_presentation, score_usefulness, feedback },
        { id: req.user.id }
      );
      res.json({ success: true, data: { score } });
    } catch (err) {
      next(err);
    }
  },

  async leaderboard(req: Request, res: Response, next: NextFunction) {
    try {
      const eventId = p(req, "eventId");
      if (!eventId) throw new ValidationError("Event ID is required");
      const board = await judgingService.leaderboard(eventId);
      res.json({ success: true, data: { leaderboard: board } });
    } catch (err) {
      next(err);
    }
  },
};
