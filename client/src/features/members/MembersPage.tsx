import { useCallback, useEffect, useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import { useAuth, useScopedEventId } from "@/app/providers";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { formatDateTime } from "@/lib/formatters";
import {
  listMembers,
  addMember,
  updateMemberRole,
  removeMember,
  type EventMember,
  type EventRole,
} from "./members.api";
import { listUsers, type PlatformUser } from "../admin/admin.api";

const ROLES: EventRole[] = ["organizer", "participant", "volunteer", "judge"];

const ROLE_BADGE: Record<EventRole, string> = {
  organizer: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  participant: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  volunteer: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  judge: "bg-sky-500/15 text-sky-300 border-sky-500/30",
};

interface Message {
  type: "success" | "error";
  text: string;
}

const selectClass =
  "rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none";

export default function MembersPage() {
  const EVENT_ID = useScopedEventId();
  const { user } = useAuth();
  const isAdmin = user?.global_role === "admin";

  const [members, setMembers] = useState<EventMember[]>([]);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState<EventRole>("participant");
  const [addError, setAddError] = useState("");
  const [saving, setSaving] = useState(false);

  const [removeTarget, setRemoveTarget] = useState<EventMember | null>(null);
  const [removing, setRemoving] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      setMembers(await listMembers(EVENT_ID));
      setMessage(null);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load members",
      });
    } finally {
      setLoading(false);
    }
  }, [EVENT_ID]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Admins additionally load the platform directory to populate the picker.
  useEffect(() => {
    if (!isAdmin) return;
    listUsers()
      .then(setUsers)
      .catch(() => setUsers([]));
  }, [isAdmin]);

  // Anyone already a member shouldn't appear in the picker again.
  const eligibleUsers = useMemo(() => {
    const memberIds = new Set(members.map((m) => m.user_id));
    return users.filter((u) => !memberIds.has(u.id));
  }, [users, members]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    if (!addUserId) {
      setAddError("Select a user to add.");
      return;
    }
    setSaving(true);
    try {
      await addMember(EVENT_ID, addUserId, addRole);
      setAddOpen(false);
      setAddUserId("");
      setAddRole("participant");
      setMessage({ type: "success", text: "Member added." });
      await loadMembers();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Could not add the member.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(member: EventMember, role: EventRole) {
    try {
      await updateMemberRole(EVENT_ID, member.user_id, role);
      setMembers((prev) =>
        prev.map((m) => (m.user_id === member.user_id ? { ...m, role } : m))
      );
      setMessage({ type: "success", text: `Role updated for ${member.full_name}.` });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Could not update the role.",
      });
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await removeMember(EVENT_ID, removeTarget.user_id);
      setMessage({ type: "success", text: `${removeTarget.full_name} removed from the event.` });
      setRemoveTarget(null);
      await loadMembers();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Could not remove the member.",
      });
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="space-y-4" data-testid="members-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Event Members</h1>
          <p className="text-sm text-gray-400 mt-1">
            {members.length} member{members.length === 1 ? "" : "s"} of this event.
            {!isAdmin && " Role changes are handled by a platform admin."}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setAddOpen(true); setAddError(""); }}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        )}
      </div>

      {message && (
        <p
          className={
            message.type === "success"
              ? "text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2"
              : "text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
          }
          role="status"
        >
          {message.text}
        </p>
      )}

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-gray-400">Loading members…</p>
        ) : members.length === 0 ? (
          <p className="p-8 text-center text-gray-400">
            No members yet.{isAdmin && " Use “Add Member” to invite the first one."}
          </p>
        ) : (
          <table className="w-full text-sm" data-testid="members-table">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-800 bg-gray-900/50">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                {isAdmin && <th className="px-4 py-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-gray-800/60 hover:bg-gray-900/40">
                  <td className="px-4 py-3 text-white font-medium">{m.full_name}</td>
                  <td className="px-4 py-3 text-gray-400">{m.email}</td>
                  <td className="px-4 py-3">
                    {isAdmin ? (
                      <select
                        className={selectClass}
                        value={m.role}
                        aria-label={`Role for ${m.full_name}`}
                        onChange={(e) => handleRoleChange(m, e.target.value as EventRole)}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-xs capitalize ${ROLE_BADGE[m.role] ?? "border-gray-700 text-gray-300"}`}
                      >
                        {m.role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full border border-gray-700 px-2.5 py-0.5 text-xs text-gray-300">
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{formatDateTime(m.joined_at)}</td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => setRemoveTarget(m)}
                      >
                        Remove
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add member dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>
              Grant a registered user a role in this event.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            {addError && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {addError}
              </p>
            )}
            <div>
              <label className="block text-sm text-gray-300 mb-1" htmlFor="member-user">User</label>
              <select
                id="member-user"
                className={`${selectClass} w-full`}
                value={addUserId}
                onChange={(e) => setAddUserId(e.target.value)}
              >
                <option value="">Select a user…</option>
                {eligibleUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.email})
                  </option>
                ))}
              </select>
              {isAdmin && eligibleUsers.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Every registered user is already a member.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1" htmlFor="member-role">Role</label>
              <select
                id="member-role"
                className={`${selectClass} w-full`}
                value={addRole}
                onChange={(e) => setAddRole(e.target.value as EventRole)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button variant="ghost" type="button" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !addUserId}>
                {saving ? "Adding…" : "Add Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <Dialog open={removeTarget !== null} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Remove “{removeTarget?.full_name}”?</DialogTitle>
            <DialogDescription>
              They lose access to this event immediately. Their account is not deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRemove} disabled={removing}>
              {removing ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
