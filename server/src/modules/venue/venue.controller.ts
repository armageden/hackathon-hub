import type { Request, Response, NextFunction } from "express";
import { venueService } from "./venue.service.js";
import { ValidationError } from "../../middleware/error.middleware.js";
import { p, type AuthRequest } from "../../types/index.js";

export const venueController = {
  async listLocations(req: Request, res: Response, next: NextFunction) {
    try {
      const eventId = p(req, "eventId");
      if (!eventId) throw new ValidationError("Event ID is required");
      const locations = await venueService.listLocations(eventId);
      res.json({ success: true, data: { locations } });
    } catch (err) {
      next(err);
    }
  },

  async createLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const eventId = p(req, "eventId");
      if (!eventId) throw new ValidationError("Event ID is required");
      const { name, location_type, capacity, description } = req.body;
      const location = await venueService.createLocation(eventId, {
        name,
        location_type,
        capacity,
        description,
      });
      res.status(201).json({ success: true, data: { location } });
    } catch (err) {
      next(err);
    }
  },

  async updateLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const eventId = p(req, "eventId");
      const locationId = p(req, "locationId");
      if (!eventId || !locationId)
        throw new ValidationError("Event ID and Location ID are required");
      const { name, location_type, capacity, description, position_x, position_y } = req.body;
      const location = await venueService.updateLocation(eventId, locationId, {
        name,
        location_type,
        capacity,
        description,
        position_x,
        position_y,
      });
      res.json({ success: true, data: { location } });
    } catch (err) {
      next(err);
    }
  },

  async deleteLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const eventId = p(req, "eventId");
      const locationId = p(req, "locationId");
      if (!eventId || !locationId)
        throw new ValidationError("Event ID and Location ID are required");
      await venueService.deleteLocation(eventId, locationId);
      res.json({ success: true, data: { message: "Location deleted" } });
    } catch (err) {
      next(err);
    }
  },

  async listAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const eventId = p(req, "eventId");
      if (!eventId) throw new ValidationError("Event ID is required");
      const location_id = typeof req.query.location_id === "string" ? req.query.location_id : undefined;
      const assignments = await venueService.listAssignments(eventId, { location_id });
      res.json({ success: true, data: { assignments } });
    } catch (err) {
      next(err);
    }
  },

  async createAssignment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = p(req, "eventId");
      if (!eventId) throw new ValidationError("Event ID is required");
      if (!req.user) throw new ValidationError("Authentication required");
      const { venue_location_id, assignable_type, team_id, project_submission_id, starts_at, ends_at } =
        req.body;
      const assignment = await venueService.createAssignment(
        eventId,
        { venue_location_id, assignable_type, team_id, project_submission_id, starts_at, ends_at },
        { id: req.user.id }
      );
      res.status(201).json({ success: true, data: { assignment } });
    } catch (err) {
      next(err);
    }
  },

  async updateAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const eventId = p(req, "eventId");
      const assignmentId = p(req, "assignmentId");
      if (!eventId || !assignmentId)
        throw new ValidationError("Event ID and Assignment ID are required");
      const { venue_location_id, assignable_type, team_id, project_submission_id, starts_at, ends_at, status } =
        req.body;
      const assignment = await venueService.updateAssignment(eventId, assignmentId, {
        venue_location_id,
        assignable_type,
        team_id,
        project_submission_id,
        starts_at,
        ends_at,
        status,
      });
      res.json({ success: true, data: { assignment } });
    } catch (err) {
      next(err);
    }
  },

  async cancelAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const eventId = p(req, "eventId");
      const assignmentId = p(req, "assignmentId");
      if (!eventId || !assignmentId)
        throw new ValidationError("Event ID and Assignment ID are required");
      await venueService.cancelAssignment(eventId, assignmentId);
      res.json({ success: true, data: { message: "Assignment cancelled" } });
    } catch (err) {
      next(err);
    }
  },
};
