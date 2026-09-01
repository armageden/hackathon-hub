import { notificationsRepository } from "./notifications.repository.js";

export const notificationsService = {
  async listNotifications(eventId: string, userId: string, unreadOnly: boolean = false) {
    return notificationsRepository.listByUser(eventId, userId, unreadOnly);
  },

  async getUnreadCount(eventId: string, userId: string) {
    return notificationsRepository.getUnreadCount(eventId, userId);
  },

  async markAsRead(eventId: string, notificationId: string, userId: string) {
    return notificationsRepository.markAsRead(eventId, notificationId, userId);
  },

  async markAllAsRead(eventId: string, userId: string) {
    return notificationsRepository.markAllAsRead(eventId, userId);
  },

  async delete(eventId: string, notificationId: string, userId: string) {
    return notificationsRepository.delete(eventId, notificationId, userId);
  },

  async notifyTeamRequest(eventId: string, organizerId: string, requesterName: string, teamName: string) {
    return notificationsRepository.create(
      eventId,
      organizerId,
      "Team Join Request",
      `${requesterName} has requested to join team "${teamName}"`,
      "team_request"
    );
  },

  async notifyTeamRequestResult(eventId: string, userId: string, teamName: string, accepted: boolean) {
    return notificationsRepository.create(
      eventId,
      userId,
      accepted ? "Team Request Accepted" : "Team Request Declined",
      accepted
        ? `Your request to join "${teamName}" has been accepted!`
        : `Your request to join "${teamName}" has been declined.`,
      accepted ? "success" : "info"
    );
  },

  async notifyCheckinReminder(eventId: string, userId: string, sessionTitle: string) {
    return notificationsRepository.create(
      eventId,
      userId,
      "Check-in Reminder",
      `Don't forget to check in for "${sessionTitle}"`,
      "reminder"
    );
  },
};
