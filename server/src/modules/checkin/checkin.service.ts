import crypto from "crypto";
import { checkinRepository } from "./checkin.repository.js";
import { NotFoundError, ConflictError, ValidationError } from "../../middleware/error.middleware.js";

export const checkinService = {
  async listCheckins(eventId: string) {
    return checkinRepository.listCheckinsByEvent(eventId);
  },

  async manualCheckin(eventId: string, userId: string, checkedBy: string, itineraryItemId?: string) {
    const existing = await checkinRepository.findCheckin(eventId, userId, itineraryItemId);
    if (existing) throw new ConflictError("User already checked in");

    const checkin = await checkinRepository.createCheckin(
      eventId, userId, "manual", checkedBy, itineraryItemId
    );
    return checkin;
  },

  async qrCheckin(eventId: string, token: string) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const qrToken = await checkinRepository.findQRToken(eventId, tokenHash);

    if (!qrToken) {
      throw new NotFoundError("Invalid or expired QR token");
    }

    const existing = await checkinRepository.findCheckin(eventId, qrToken.user_id);
    if (existing) throw new ConflictError("User already checked in");

    const claimed = await checkinRepository.claimQRToken(qrToken.id);
    if (!claimed) {
      throw new ConflictError("QR token already used");
    }

    const checkin = await checkinRepository.createCheckin(
      eventId, qrToken.user_id, "qr", null
    );
    return { checkin, userId: qrToken.user_id };
  },

  async generateQRToken(eventId: string, userId: string, expiresInMinutes?: number) {
    return checkinRepository.createQRToken(eventId, userId, expiresInMinutes);
  },

  async getStats(eventId: string) {
    return checkinRepository.getCheckinStats(eventId);
  },

  async bulkCheckin(eventId: string, userIds: string[], checkedBy: string, itineraryItemId: string) {
    let checkedIn = 0;
    for (const userId of userIds) {
      try {
        const existing = await checkinRepository.findCheckin(eventId, userId, itineraryItemId);
        if (!existing) {
          await checkinRepository.createCheckin(
            eventId, userId, "manual", checkedBy, itineraryItemId
          );
          checkedIn++;
        }
      } catch {
        // Skip individual failures silently in bulk operations
      }
    }
    return checkedIn;
  },

  async checkout(eventId: string, checkinId: string) {
    const checkin = await checkinRepository.findCheckinById(eventId, checkinId);
    if (!checkin) throw new NotFoundError("Check-in record not found");
    if (checkin.checked_out_at) throw new ConflictError("Already checked out");

    return checkinRepository.checkout(checkinId);
  },
};