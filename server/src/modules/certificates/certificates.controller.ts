import type { Request, Response, NextFunction } from "express";
import { certificatesService } from "./certificates.service.js";
import { ValidationError } from "../../middleware/error.middleware.js";
import { p } from "../../types/index.js";

export const certificatesController = {
  async listCertificates(req: Request, res: Response, next: NextFunction) {
    try {
      const eventId = p(req, "eventId");
      if (!eventId) throw new ValidationError("Event ID is required");
      const certificates = await certificatesService.listCertificates(eventId);
      res.json({ success: true, data: { certificates } });
    } catch (err) {
      next(err);
    }
  },

  async checkEligibility(req: Request, res: Response, next: NextFunction) {
    try {
      const eventId = p(req, "eventId");
      if (!eventId) throw new ValidationError("Event ID is required");
      const eligibility = await certificatesService.checkEligibility(eventId);
      res.json({ success: true, data: { eligibility } });
    } catch (err) {
      next(err);
    }
  },

  async issueCertificate(req: Request, res: Response, next: NextFunction) {
    try {
      const eventId = p(req, "eventId");
      const { user_id, certificate_type, metadata } = req.body;
      if (!eventId) throw new ValidationError("Event ID is required");
      if (!user_id) throw new ValidationError("User ID is required");
      if (!certificate_type) throw new ValidationError("Certificate type is required");

      const certificate = await certificatesService.createCertificate(
        eventId, user_id, certificate_type, metadata
      );
      const issued = await certificatesService.issueCertificate(eventId, certificate.id);
      res.status(201).json({ success: true, data: { certificate: issued } });
    } catch (err) {
      next(err);
    }
  },

  async revokeCertificate(req: Request, res: Response, next: NextFunction) {
    try {
      const eventId = p(req, "eventId");
      const certificateId = p(req, "certificateId");
      if (!eventId) throw new ValidationError("Event ID is required");
      if (!certificateId) throw new ValidationError("Certificate ID is required");

      const certificate = await certificatesService.revokeCertificate(eventId, certificateId);
      res.json({ success: true, data: { certificate } });
    } catch (err) {
      next(err);
    }
  },

  async verifyCertificate(req: Request, res: Response, next: NextFunction) {
    try {
      const code = p(req, "code");
      if (!code) throw new ValidationError("Verification code is required");

      const certificate = await certificatesService.verifyCertificate(code);
      res.json({ success: true, data: { certificate } });
    } catch (err) {
      next(err);
    }
  },

  async bulkCreateAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const eventId = p(req, "eventId");
      if (!eventId) throw new ValidationError("Event ID is required");

      const result = await certificatesService.bulkCreateAttendance(eventId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
};