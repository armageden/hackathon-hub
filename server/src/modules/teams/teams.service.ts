import { teamsRepository } from "./teams.repository.js";
import { participantsRepository } from "../participants/participants.repository.js";
import { eventMembersRepository } from "../event-members/event-members.repository.js";
import { notificationsService } from "../notifications/notifications.service.js";
import { NotFoundError, ConflictError, ValidationError, AuthorizationError } from "../../middleware/error.middleware.js";

export const teamsService = {
  async listTeams(eventId: string) {
    return teamsRepository.listByEvent(eventId);
  },

  async getTeam(eventId: string, teamId: string) {
    const team = await teamsRepository.findById(eventId, teamId);
    if (!team) throw new NotFoundError("Team not found");
    return team;
  },

  async createTeam(eventId: string, userId: string, name: string, description?: string, maxSize?: number) {
    if (!name || name.trim().length === 0) throw new ValidationError("Team name is required");
    if (maxSize !== undefined && maxSize < 1) throw new ValidationError("Max size must be at least 1");

    // Organizers can create teams but don't become members
    const membership = await eventMembersRepository.getMyRole(eventId, userId);
    const isOrganizer = membership?.role === "organizer";

    if (!isOrganizer) {
      const hasTeam = await teamsRepository.hasTeamInEvent(eventId, userId);
      if (hasTeam) throw new ConflictError("You are already in a team for this event");
    }

    const team = await teamsRepository.create(
      eventId,
      name.trim(),
      description || null,
      maxSize || 5,
      userId,
      isOrganizer  // skipMember = true for organizers
    );

    // If organizer, don't add them as a member - team starts empty for assignment
    if (isOrganizer) {
      return teamsRepository.findById(eventId, team.id);
    }

    return teamsRepository.findById(eventId, team.id);
  },

  async updateTeam(eventId: string, teamId: string, userId: string, fields: { name?: string; description?: string; max_size?: number; status?: string }) {
    const team = await teamsRepository.findById(eventId, teamId);
    if (!team) throw new NotFoundError("Team not found");

    const isOwner = await teamsRepository.isOwner(teamId, userId);
    if (!isOwner) throw new AuthorizationError("Only the team owner can update the team");

    if (fields.max_size !== undefined) {
      const memberCount = await teamsRepository.getMemberCount(teamId);
      if (fields.max_size < memberCount) {
        throw new ValidationError(`Cannot set max size to ${fields.max_size}: team already has ${memberCount} members`);
      }
    }

    const updated = await teamsRepository.update(eventId, teamId, fields);
    return teamsRepository.findById(eventId, teamId);
  },

  async deleteTeam(eventId: string, teamId: string, userId: string) {
    const team = await teamsRepository.findById(eventId, teamId);
    if (!team) throw new NotFoundError("Team not found");

    const isOwner = await teamsRepository.isOwner(teamId, userId);
    if (!isOwner) throw new AuthorizationError("Only the team owner can delete the team");

    return teamsRepository.delete(eventId, teamId);
  },

  async deleteTeamByOrganizer(eventId: string, teamId: string) {
    const team = await teamsRepository.findById(eventId, teamId);
    if (!team) throw new NotFoundError("Team not found");
    return teamsRepository.delete(eventId, teamId);
  },

  async forceJoinTeam(eventId: string, teamId: string, targetUserId: string) {
    const team = await teamsRepository.findById(eventId, teamId);
    if (!team) throw new NotFoundError("Team not found");

    // Force-join is for assigning existing participants — never a backdoor to
    // add platform users who aren't part of this event.
    const membership = await eventMembersRepository.getMyRole(eventId, targetUserId);
    if (!membership || !["active", "approved"].includes(membership.status)) {
      throw new AuthorizationError("User is not an active member of this event");
    }

    return teamsRepository.addMemberAtomically(eventId, teamId, targetUserId, {
      assignedBy: undefined,
    });
  },

  async joinTeam(eventId: string, teamId: string, userId: string) {
    const team = await teamsRepository.findById(eventId, teamId);
    if (!team) throw new NotFoundError("Team not found");

    // Organizers should not be part of teams
    const membership = await eventMembersRepository.getMyRole(eventId, userId);
    if (membership?.role === "organizer") {
      throw new AuthorizationError("Organizers cannot join teams");
    }

    // Capacity and one-team-per-event are enforced under a row lock so
    // concurrent joins can't overfill or double-team.
    return teamsRepository.addMemberAtomically(eventId, teamId, userId, {
      requireTeamless: true,
    });
  },

  async leaveTeam(eventId: string, teamId: string, userId: string) {
    const team = await teamsRepository.findById(eventId, teamId);
    if (!team) throw new NotFoundError("Team not found");

    const isMember = await teamsRepository.isMember(teamId, userId);
    if (!isMember) throw new ValidationError("You are not a member of this team");

    const isOwner = await teamsRepository.isOwner(teamId, userId);
    if (isOwner) throw new ValidationError("Team owners cannot leave. Transfer ownership or delete the team.");

    await teamsRepository.removeMember(teamId, userId);

    const memberCount = await teamsRepository.getMemberCount(teamId);
    if (memberCount < team.max_size && team.status === "full") {
      await teamsRepository.update(eventId, teamId, { status: "forming" });
    }

    return { message: "Left the team" };
  },

  async removeMember(eventId: string, teamId: string, targetUserId: string, requesterId: string) {
    const team = await teamsRepository.findById(eventId, teamId);
    if (!team) throw new NotFoundError("Team not found");

    const isOwner = await teamsRepository.isOwner(teamId, requesterId);
    const membership = await eventMembersRepository.getMyRole(eventId, requesterId);
    const isOrganizer = membership?.role === "organizer";

    if (!isOwner && !isOrganizer) throw new AuthorizationError("Only the team owner or an organizer can remove members");

    // Organizers can remove anyone including owners
    // Team owners can only remove non-owners
    if (!isOrganizer && isOwner) {
      const targetIsOwner = await teamsRepository.isOwner(teamId, targetUserId);
      if (targetIsOwner) throw new ValidationError("Owners cannot remove themselves. Delete the team instead.");
    }

    const removed = await teamsRepository.removeMember(teamId, targetUserId);
    if (!removed) throw new NotFoundError("User is not a member of this team");

    const memberCount = await teamsRepository.getMemberCount(teamId);
    if (memberCount < team.max_size && team.status === "full") {
      await teamsRepository.update(eventId, teamId, { status: "forming" });
    }

    // If team is now empty, delete it
    if (memberCount === 0) {
      await teamsRepository.delete(eventId, teamId);
      return { message: "Member removed. Team was empty and has been deleted." };
    }

    return { message: "Member removed" };
  },

  async applyToTeam(eventId: string, teamId: string, userId: string, message?: string) {
    const team = await teamsRepository.findById(eventId, teamId);
    if (!team) throw new NotFoundError("Team not found");
    if (team.status === "dissolved") throw new ValidationError("Cannot apply to a dissolved team");

    const hasOtherTeam = await teamsRepository.hasTeamInEvent(eventId, userId);
    if (hasOtherTeam) throw new ConflictError("You are already in a team for this event");

    const profile = await participantsRepository.findProfileByEventAndUser(eventId, userId);
    if (!profile) throw new ValidationError("You must create a participant profile first");

    const memberCount = await teamsRepository.getMemberCount(teamId);
    if (memberCount >= team.max_size) throw new ConflictError("Team is full");

    const application = await teamsRepository.createApplication(teamId, profile.id, message || null);
    if (!application) throw new ConflictError("You already have a pending application to this team");

    // Best-effort notify the team owner — never fail the apply over a notification.
    try {
      const requester = await participantsRepository.findProfileById(profile.id);
      const requesterName = requester?.full_name ?? "A participant";
      await notificationsService.notifyTeamRequest(eventId, team.created_by, requesterName, team.name);
    } catch (err) {
      console.error("[teams.applyToTeam] notification failed:", err);
    }

    return application;
  },

  async listApplications(teamId: string, userId: string) {
    const isMember = await teamsRepository.isMember(teamId, userId);
    if (!isMember) throw new AuthorizationError("Only team members can view applications");

    return teamsRepository.listApplications(teamId);
  },

  async reviewApplication(eventId: string, applicationId: string, status: string, reviewerId: string) {
    if (!["approved", "rejected"].includes(status)) {
      throw new ValidationError("Status must be 'approved' or 'rejected'");
    }

    const application = await teamsRepository.getApplicationById(applicationId);
    if (!application) throw new NotFoundError("Application not found");
    if (application.status !== "pending") throw new ConflictError("Application has already been reviewed");

    const isOwner = await teamsRepository.isOwner(application.team_id, reviewerId);
    if (!isOwner) throw new AuthorizationError("Only the team owner can review applications");

    const team = await teamsRepository.findById(eventId, application.team_id);
    if (!team) throw new NotFoundError("Team not found");

    if (status === "approved") {
      const profile = await participantsRepository.findProfileById(application.participant_profile_id);
      if (!profile) throw new NotFoundError("Participant profile not found");

      // Capacity and one-team-per-event are enforced under a row lock, and
      // the applicant's other pending applications are closed so a second
      // owner can't approve them afterwards.
      await teamsRepository.addMemberAtomically(eventId, application.team_id, profile.user_id, {
        requireTeamless: true,
        assignedBy: reviewerId,
      });
      await teamsRepository.closeOtherPendingApplications(
        application.participant_profile_id,
        application.team_id,
        reviewerId
      );
    }

    const updated = await teamsRepository.updateApplication(applicationId, status, reviewerId);

    // Best-effort notify the applicant of the decision.
    try {
      const applicantProfile = await participantsRepository.findProfileById(application.participant_profile_id);
      if (applicantProfile) {
        await notificationsService.notifyTeamRequestResult(
          eventId,
          applicantProfile.user_id,
          team.name,
          status === "approved"
        );
      }
    } catch (err) {
      console.error("[teams.reviewApplication] notification failed:", err);
    }

    return updated;
  },

  async autoAssign(eventId: string, maxSize: number = 5) {
    return teamsRepository.autoAssignSoloParticipants(eventId, maxSize);
  },
};
