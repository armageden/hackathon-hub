import { certificatesRepository } from "./certificates.repository.js";
import { NotFoundError, ConflictError, ValidationError } from "../../middleware/error.middleware.js";

export const certificatesService = {
  async listCertificates(eventId: string) {
    return certificatesRepository.listByEvent(eventId);
  },

  async getMyCertificates(eventId: string, userId: string) {
    return certificatesRepository.findByUser(eventId, userId);
  },

  async verifyCertificate(verificationCode: string) {
    const cert = await certificatesRepository.findByVerificationCode(verificationCode);
    if (!cert) throw new NotFoundError("Certificate not found or not yet issued");
    return cert;
  },

  async checkEligibility(eventId: string) {
    const participants = await certificatesRepository.checkEligibility(eventId);
    return participants.map((p) => ({
      user_id: p.user_id,
      full_name: p.full_name,
      email: p.email,
      eligible: p.has_checkin && p.has_team && p.has_project,
      has_checkin: p.has_checkin,
      has_team: p.has_team,
      has_project: p.has_project,
      already_certified: p.already_certified,
    }));
  },

  async createCertificate(
    eventId: string,
    userId: string,
    certificateType: string,
    metadata?: Record<string, any>
  ) {
    if (!["attendance", "completion", "volunteer", "judge"].includes(certificateType)) {
      throw new ValidationError("Invalid certificate type");
    }
    const cert = await certificatesRepository.createCertification(
      eventId, userId, certificateType, metadata
    );
    if (!cert) throw new ConflictError("Certificate already exists for this user and type");
    return cert;
  },

  async issueCertificate(eventId: string, certificateId: string) {
    const cert = await certificatesRepository.issueCertificate(eventId, certificateId);
    if (!cert) throw new NotFoundError("Certificate not found or already issued/revoked");
    return cert;
  },

  async revokeCertificate(eventId: string, certificateId: string) {
    const cert = await certificatesRepository.revokeCertificate(eventId, certificateId);
    if (!cert) throw new NotFoundError("Certificate not found or already revoked");
    return cert;
  },

  async bulkCreateAttendance(eventId: string) {
    return certificatesRepository.bulkCreateEligible(eventId);
  },
};