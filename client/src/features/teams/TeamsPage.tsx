import { useState, useEffect } from "react";
import {
  listTeams,
  createTeam,
  joinTeam,
  leaveTeam,
  listParticipants,
  getMyProfile,
  createOrUpdateProfile,
  applyToTeam,
  getTechTags,
  deleteTeamByAdmin,
  forceJoinTeam,
} from "./teams.api";
import type { Team, ParticipantProfile, TechTag } from "./teams.types";
import { useEventRole } from "../../hooks/useEventRole";
import { useScopedEventId } from "../../app/providers";
import { formatStatus } from '@/lib/formatters';

type Tab = "teams" | "profile" | "browse";

export default function TeamsPage() {
  const EVENT_ID = useScopedEventId();
  const { isOrganizer, isParticipant, loading: roleLoading } = useEventRole(EVENT_ID);
  const [activeTab, setActiveTab] = useState<Tab>("teams");

  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  const [profile, setProfile] = useState<ParticipantProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [allParticipants, setAllParticipants] = useState<ParticipantProfile[]>([]);
  const [browseLoaded, setBrowseLoaded] = useState(false);
  const [browseLoading, setBrowseLoading] = useState(false);

  const [techTags, setTechTags] = useState<TechTag[]>([]);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");
  const [newTeamMax, setNewTeamMax] = useState("4");
  const [creatingTeam, setCreatingTeam] = useState(false);

  const [bio, setBio] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("beginner");
  const [preferredRole, setPreferredRole] = useState("");
  const [lookingForTeam, setLookingForTeam] = useState(false);
  const [techStackSummary, setTechStackSummary] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);

  const [applyTarget, setApplyTarget] = useState<Team | null>(null);
  const [applyMessage, setApplyMessage] = useState("");
  const [applying, setApplying] = useState(false);

  const [assignTarget, setAssignTarget] = useState<Team | null>(null);
  const [assignUserId, setAssignUserId] = useState("");
  const [assigning, setAssigning] = useState(false);

  function showMsg(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  async function fetchTeams() {
    setTeamsLoading(true);
    try {
      const res = await listTeams(EVENT_ID);
      setTeams(res.teams);
    } catch (err: any) {
      showMsg("error", err?.message ?? "Failed to load teams");
    } finally {
      setTeamsLoading(false);
    }
  }

  async function fetchProfile() {
    setProfileLoading(true);
    try {
      const res = await getMyProfile(EVENT_ID);
      const p = res.profile;
      setProfile(p);
      if (p) {
        setBio(p.bio ?? "");
        setExperienceLevel(p.experience_level ?? "beginner");
        setPreferredRole(p.preferred_role ?? "");
        setLookingForTeam(p.looking_for_team);
        setTechStackSummary(p.tech_stack_summary ?? "");
        setSelectedTagIds(p.tech_stack.map((t) => t.id));
      }
    } catch (err: any) {
      showMsg("error", err?.message ?? "Failed to load profile");
    } finally {
      setProfileLoading(false);
    }
  }

  async function fetchBrowse() {
    setBrowseLoading(true);
    try {
      const res = await listParticipants(EVENT_ID);
      setAllParticipants(res.participants);
      setBrowseLoaded(true);
    } catch (err: any) {
      showMsg("error", err?.message ?? "Failed to load participants");
    } finally {
      setBrowseLoading(false);
    }
  }

  async function fetchTechTags() {
    try {
      const res = await getTechTags();
      setTechTags(res.tags);
    } catch {
      // non-critical
    }
  }

  useEffect(() => {
    if (!roleLoading) {
      fetchTeams();
      fetchProfile();
      fetchTechTags();
    }
  }, [roleLoading]);

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!newTeamName.trim()) return showMsg("error", "Team name is required");
    setCreatingTeam(true);
    try {
      await createTeam(EVENT_ID, newTeamName.trim(), newTeamDesc.trim() || undefined, Number(newTeamMax) || 4);
      showMsg("success", "Team created!");
      setNewTeamName("");
      setNewTeamDesc("");
      setNewTeamMax("4");
      fetchTeams();
      fetchProfile();
    } catch (err: any) {
      showMsg("error", err?.message ?? "Failed to create team");
    } finally {
      setCreatingTeam(false);
    }
  }

  async function handleJoinTeam(teamId: string) {
    try {
      await joinTeam(EVENT_ID, teamId);
      showMsg("success", "Joined team!");
      fetchTeams();
      fetchProfile();
    } catch (err: any) {
      showMsg("error", err?.message ?? "Failed to join team");
    }
  }

  async function handleLeaveTeam(teamId: string) {
    try {
      await leaveTeam(EVENT_ID, teamId);
      showMsg("success", "Left team");
      fetchTeams();
      fetchProfile();
    } catch (err: any) {
      showMsg("error", err?.message ?? "Failed to leave team");
    }
  }

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!applyTarget) return;
    setApplying(true);
    try {
      await applyToTeam(EVENT_ID, applyTarget.id, applyMessage.trim() || undefined);
      showMsg("success", "Application sent!");
      setApplyTarget(null);
      setApplyMessage("");
    } catch (err: any) {
      showMsg("error", err?.message ?? "Failed to apply");
    } finally {
      setApplying(false);
    }
  }

  async function handleDeleteTeam(teamId: string) {
    if (!confirm("Are you sure you want to delete this team?")) return;
    try {
      await deleteTeamByAdmin(EVENT_ID, teamId);
      showMsg("success", "Team deleted!");
      fetchTeams();
      fetchProfile();
    } catch (err: any) {
      showMsg("error", err?.message ?? "Failed to delete team");
    }
  }

  async function handleForceJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!assignTarget || !assignUserId.trim()) return;
    setAssigning(true);
    try {
      await forceJoinTeam(EVENT_ID, assignTarget.id, assignUserId.trim());
      showMsg("success", "Participant assigned to team!");
      setAssignTarget(null);
      setAssignUserId("");
      fetchTeams();
    } catch (err: any) {
      showMsg("error", err?.message ?? "Failed to assign participant");
    } finally {
      setAssigning(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await createOrUpdateProfile(EVENT_ID, {
        bio: bio.trim() || undefined,
        experience_level: experienceLevel,
        preferred_role: preferredRole.trim() || undefined,
        looking_for_team: lookingForTeam,
        tech_stack_summary: techStackSummary.trim() || undefined,
        tech_stack_tag_ids: selectedTagIds,
      });
      setProfile(res.profile);
      showMsg("success", "Profile saved!");
    } catch (err: any) {
      showMsg("error", err?.message ?? "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  function myTeamId(): string | null {
    if (!profile) return null;
    for (const t of teams) {
      if (t.members.some((m) => m.user_id === profile.user_id)) return t.id;
    }
    return null;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "teams", label: "Teams" },
    // Profiles are participant-scoped server-side (GET /participants/me is
    // organizer|participant only) — showing it to volunteers/judges just
    // renders a blank form.
    ...(isParticipant ? [{ key: "profile" as Tab, label: "My Profile" }] : []),
    { key: "browse", label: isOrganizer ? "All Participants" : "Browse Solo" },
  ];

  const inputClass =
    "w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500";

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Teams</h1>

        {message && (
          <div
            className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${
              message.type === "success"
                ? "bg-emerald-900/60 text-emerald-300 border border-emerald-700"
                : "bg-red-900/60 text-red-300 border border-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex gap-1 border-b border-gray-800 mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setActiveTab(t.key);
                if (t.key === "browse" && !browseLoaded && !browseLoading) {
                  fetchBrowse();
                }
              }}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === t.key
                  ? "bg-gray-800 text-white border-b-2 border-indigo-500"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {roleLoading ? (
          <div className="text-center text-gray-500 py-12">Loading...</div>
        ) : (
          <>
            {/* ========== TEAMS TAB ========== */}
            {activeTab === "teams" && (
              <div className="space-y-6">
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                  <h2 className="text-lg font-semibold mb-4">Create a Team</h2>
                  <form onSubmit={handleCreateTeam} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-400 mb-1">Team Name</label>
                      <input
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="Enter team name"
                        className={inputClass}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-400 mb-1">Description</label>
                      <input
                        value={newTeamDesc}
                        onChange={(e) => setNewTeamDesc(e.target.value)}
                        placeholder="Optional"
                        className={inputClass}
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-xs text-gray-400 mb-1">Max Size</label>
                      <input
                        type="number"
                        min={2}
                        max={10}
                        value={newTeamMax}
                        onChange={(e) => setNewTeamMax(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={creatingTeam}
                      className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                    >
                      {creatingTeam ? "Creating..." : "Create"}
                    </button>
                  </form>
                </div>

                {teamsLoading ? (
                  <p className="text-gray-400 text-sm">Loading teams...</p>
                ) : teams.length === 0 ? (
                  <p className="text-gray-500 text-sm">No teams yet. Be the first to create one!</p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {teams.map((team) => {
                      const currentMyTeamId = myTeamId();
                      const isMember = currentMyTeamId === team.id;
                      const isOnAnyTeam = currentMyTeamId !== null;
                      return (
                        <div key={team.id} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-white">{team.name}</h3>
                              {team.description && (
                                <p className="text-xs text-gray-400 mt-1">{team.description}</p>
                              )}
                            </div>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                team.status === "forming"
                                  ? "bg-emerald-900/50 text-emerald-300"
                                  : "bg-gray-800 text-gray-400"
                              }`}
                            >
                              {formatStatus(team.status)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                            <span>
                              {team.member_count}/{team.max_size} members
                            </span>
                            <span>-</span>
                            <span>by {team.creator_name}</span>
                          </div>

                          {team.members.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {team.members.map((m) => (
                                <span
                                  key={m.id}
                                  className="text-xs bg-gray-800 text-gray-300 rounded-full px-2 py-0.5"
                                >
                                  {m.full_name}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-2 flex-wrap">
                            {!isOrganizer && (
                              isMember ? (
                                <button
                                  onClick={() => handleLeaveTeam(team.id)}
                                  className="text-xs rounded-lg bg-red-900/50 px-3 py-1.5 text-red-300 hover:bg-red-900 transition-colors"
                                >
                                  Leave Team
                                </button>
                              ) : !isOnAnyTeam && team.member_count < team.max_size ? (
                                <button
                                  onClick={() => handleJoinTeam(team.id)}
                                  className="text-xs rounded-lg bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-500 transition-colors"
                                >
                                  Join Team
                                </button>
                              ) : !isMember && team.member_count < team.max_size ? (
                                <button
                                  onClick={() => {
                                    setApplyTarget(team);
                                    setApplyMessage("");
                                  }}
                                  className="text-xs rounded-lg bg-gray-800 px-3 py-1.5 text-gray-300 hover:bg-gray-700 border border-gray-700 transition-colors"
                                >
                                  Apply
                                </button>
                              ) : null
                            )}

                            {isOrganizer && (
                              <>
                                <button
                                  onClick={() => handleDeleteTeam(team.id)}
                                  className="text-xs rounded-lg bg-red-600/10 px-3 py-1.5 text-red-400 hover:bg-red-600/20 border border-red-500/20 transition-colors"
                                >
                                  Delete
                                </button>
                                {team.member_count < team.max_size && (
                                  <button
                                    onClick={() => {
                                      setAssignTarget(team);
                                      setAssignUserId("");
                                    }}
                                    className="text-xs rounded-lg bg-emerald-600/10 px-3 py-1.5 text-emerald-400 hover:bg-emerald-600/20 border border-emerald-500/20 transition-colors"
                                  >
                                    + Assign
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ========== PROFILE TAB ========== */}
            {activeTab === "profile" && (
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h2 className="text-lg font-semibold mb-4">My Profile</h2>
                {profileLoading ? (
                  <p className="text-gray-400 text-sm">Loading profile...</p>
                ) : (
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Bio</label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                        placeholder="Tell others about yourself..."
                        className={inputClass}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Experience Level</label>
                        <select
                          value={experienceLevel}
                          onChange={(e) => setExperienceLevel(e.target.value)}
                          className={inputClass}
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                          <option value="expert">Expert</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Preferred Role</label>
                        <input
                          value={preferredRole}
                          onChange={(e) => setPreferredRole(e.target.value)}
                          placeholder="e.g. Frontend Developer"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Tech Stack Summary</label>
                      <textarea
                        value={techStackSummary}
                        onChange={(e) => setTechStackSummary(e.target.value)}
                        rows={2}
                        placeholder="Brief summary of your tech stack..."
                        className={inputClass}
                      />
                    </div>

                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Team Preference
                      </label>
                      <p className="text-xs text-gray-500 mb-3">
                        Choose how you want to participate. Admins can assign you to a team if you select "Open to team assignment".
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setLookingForTeam(!lookingForTeam)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            lookingForTeam ? "bg-indigo-600" : "bg-gray-700"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              lookingForTeam ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                        <span className="text-sm text-gray-300">
                          {lookingForTeam
                            ? "Looking for a team - visible to others in Browse"
                            : "Solo or already in a team"}
                        </span>
                      </div>
                    </div>

                    {techTags.length > 0 && (
                      <div>
                        <label className="block text-xs text-gray-400 mb-2">Tech Tags</label>
                        <div className="flex flex-wrap gap-2">
                          {techTags.map((tag) => (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => toggleTag(tag.id)}
                              className={`text-xs rounded-full px-3 py-1 transition-colors ${
                                selectedTagIds.includes(tag.id)
                                  ? "bg-indigo-600 text-white"
                                  : "bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700"
                              }`}
                            >
                              {tag.name}
                              {tag.category ? ` (${tag.category})` : ""}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                    >
                      {savingProfile ? "Saving..." : "Save Profile"}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ========== BROWSE TAB ========== */}
            {activeTab === "browse" && (
              <div className="space-y-4">
                {isOrganizer ? (
                  <h2 className="text-lg font-semibold">All Participants</h2>
                ) : (
                  <h2 className="text-lg font-semibold">Participants Looking for Teams</h2>
                )}

                {!browseLoaded ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-sm mb-4">
                      {isOrganizer
                        ? "Click below to view all participants and assign them to teams."
                        : "Click below to see participants who are looking for a team."}
                    </p>
                    <button
                      onClick={fetchBrowse}
                      disabled={browseLoading}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {browseLoading ? "Loading..." : "Load Participants"}
                    </button>
                  </div>
                ) : browseLoading ? (
                  <p className="text-gray-400 text-sm">Loading participants...</p>
                ) : allParticipants.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    {isOrganizer
                      ? "No participants found."
                      : "No participants looking for teams right now."}
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {allParticipants.map((p) => (
                      <div key={p.id} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-white">
                              {p.full_name || p.user_id.slice(0, 8) + "..."}
                            </h3>
                            {p.experience_level && (
                              <span className="text-xs bg-gray-800 text-gray-400 rounded-full px-2 py-0.5 mt-1 inline-block">
                                {p.experience_level}
                              </span>
                            )}
                          </div>
                          {p.preferred_role && (
                            <span className="text-xs text-indigo-400">{p.preferred_role}</span>
                          )}
                        </div>
                        {p.bio && <p className="text-sm text-gray-400 mb-2">{p.bio}</p>}
                        {p.tech_stack_summary && (
                          <p className="text-xs text-gray-500 mb-2">{p.tech_stack_summary}</p>
                        )}
                        {p.tech_stack.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {p.tech_stack.map((tag) => (
                              <span
                                key={tag.id}
                                className="text-xs bg-gray-800 text-gray-300 rounded-full px-2 py-0.5"
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(p.user_id)}
                            className="text-xs text-gray-500 hover:text-gray-300 font-mono transition-colors"
                            title="Click to copy full ID"
                          >
                            ID: {p.user_id.slice(0, 8)}… 📋
                          </button>
                          {p.looking_for_team && (
                            <span className="text-xs bg-emerald-900/50 text-emerald-300 rounded-full px-2 py-0.5">
                              Looking for team
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ========== APPLY MODAL ========== */}
      {applyTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-1">Apply to {applyTarget.name}</h3>
            <p className="text-xs text-gray-400 mb-4">
              Send a message to the team creator.
            </p>
            <form onSubmit={handleApply} className="space-y-4">
              <textarea
                value={applyMessage}
                onChange={(e) => setApplyMessage(e.target.value)}
                rows={3}
                placeholder="Why do you want to join? (optional)"
                className={inputClass}
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setApplyTarget(null)}
                  className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 border border-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applying}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                >
                  {applying ? "Sending..." : "Send Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== ASSIGN MODAL ========== */}
      {assignTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-1">Assign to {assignTarget.name}</h3>
            <p className="text-xs text-gray-400 mb-4">
              Force-add a participant to this team.
            </p>
            <form onSubmit={handleForceJoin} className="space-y-4">
              <input
                type="text"
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
                placeholder="Enter user ID"
                className={inputClass}
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setAssignTarget(null)}
                  className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 border border-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning || !assignUserId.trim()}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                >
                  {assigning ? "Assigning..." : "Assign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
