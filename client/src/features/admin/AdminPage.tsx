import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { useAuth } from "@/app/providers";
import { formatDateTime } from "@/lib/formatters";
import * as adminApi from "./admin.api";
import type { AdminAccount } from "./admin.api";

export default function AdminPage() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [email, setEmail] = useState("");
  const [grantMode, setGrantMode] = useState<"temporary" | "permanent">("temporary");
  const [expiry, setExpiry] = useState(() => {
    const d = new Date(Date.now() + 86_400_000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [granting, setGranting] = useState(false);
  const [demoteTarget, setDemoteTarget] = useState<AdminAccount | null>(null);
  const [demoting, setDemoting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAdmins(await adminApi.listAdmins());
      setMessage(null);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load admins",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleGrant = async () => {
    if (!email.trim() || granting) return;
    if (effectiveMode === "temporary") {
      const picked = new Date(expiry);
      if (Number.isNaN(picked.getTime()) || picked.getTime() <= Date.now()) {
        setMessage({ type: "error", text: "Pick an expiry in the future, or use a preset" });
        return;
      }
    }
    setGranting(true);
    try {
      // Temporary uses the picked datetime; permanent sends no expiry.
      const expiresAt = effectiveMode === "temporary" ? new Date(expiry).toISOString() : undefined;
      const granted = await adminApi.grantAdmin(email.trim(), expiresAt);
      setMessage({
        type: "success",
        text: granted.admin_expires_at
          ? `${granted.full_name} is now a temporary admin until ${formatDateTime(granted.admin_expires_at)}`
          : `${granted.full_name} is now a permanent admin`,
      });
      setEmail("");
      setExpiry("");
      await load();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to grant admin",
      });
    } finally {
      setGranting(false);
    }
  };

  const handleDemote = async () => {
    if (!demoteTarget || demoting) return;
    setDemoting(true);
    try {
      await adminApi.demoteAdmin(demoteTarget.id);
      setMessage({ type: "success", text: `${demoteTarget.full_name} is no longer an admin` });
      setDemoteTarget(null);
      await load();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to demote admin",
      });
    } finally {
      setDemoting(false);
    }
  };

  const isExpired = (a: AdminAccount) =>
    a.admin_expires_at != null && new Date(a.admin_expires_at) <= new Date();

  // A temporary admin cannot grant permanent access (the server enforces it too).
  const iAmPermanentAdmin = user?.admin_expires_at == null;
  const effectiveMode = grantMode === "permanent" && !iAmPermanentAdmin ? "temporary" : grantMode;

  const applyPreset = (hours: number) => {
    setGrantMode("temporary");
    const d = new Date(Date.now() + hours * 3_600_000);
    const pad = (n: number) => String(n).padStart(2, "0");
    setExpiry(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-indigo-400" />
          Admin Management
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Grant admin access — permanently, or temporarily until an expiry date. Temporary admins
          lose their rights automatically when the window lapses.
        </p>
      </div>

      {message && (
        <div
          className={
            message.type === "error"
              ? "rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300"
              : "rounded-lg border border-green-800 bg-green-950/50 px-4 py-3 text-sm text-green-300"
          }
        >
          {message.text}
        </div>
      )}

      <div className="card p-4">
        <h2 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-gray-400" />
          Grant admin access
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {(["temporary", "permanent"] as const).map((mode) => {
              const disabled = mode === "permanent" && !iAmPermanentAdmin;
              return (
                <button
                  key={mode}
                  type="button"
                  disabled={disabled}
                  onClick={() => setGrantMode(mode)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    effectiveMode === mode
                      ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                      : "bg-gray-900 text-gray-400 border-gray-700 hover:text-gray-200"
                  }`}
                >
                  {mode === "temporary" ? "Temporary admin" : "Permanent admin"}
                </button>
              );
            })}
            {!iAmPermanentAdmin && (
              <span className="text-xs text-amber-400">
                You are a temporary admin — you can only grant temporary access.
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label htmlFor="admin-grant-email" className="block text-sm text-gray-300 mb-1">
                User email
              </label>
              <Input
                id="admin-grant-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@hackathon.com"
              />
            </div>
            {effectiveMode === "temporary" && (
              <>
                <div>
                  <label htmlFor="admin-grant-expiry" className="block text-sm text-gray-300 mb-1">
                    Expires at
                  </label>
                  <Input
                    id="admin-grant-expiry"
                    type="datetime-local"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                  />
                </div>
                <div className="flex gap-1 pb-0.5">
                  {[
                    { label: "1 hour", hours: 1 },
                    { label: "1 day", hours: 24 },
                    { label: "1 week", hours: 24 * 7 },
                  ].map((preset) => (
                    <Button key={preset.label} variant="secondary" size="sm" onClick={() => applyPreset(preset.hours)}>
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </>
            )}
            <Button onClick={handleGrant} disabled={!email.trim() || granting}>
              {granting
                ? "Granting..."
                : effectiveMode === "temporary"
                  ? "Grant Temporary Admin"
                  : "Grant Permanent Admin"}
            </Button>
          </div>
          {effectiveMode === "temporary" ? (
            <p className="text-xs text-gray-500">
              The user is an admin until the expiry instant, then automatically reverts to a normal
              user — no action needed.
            </p>
          ) : (
            <p className="text-xs text-gray-500">
              Permanent admin until demoted. Only a permanent admin can grant permanent access.
            </p>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading admins...</div>
        ) : admins.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No admins found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-900 border-b border-gray-800">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Access</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-900/50">
                  <td className="px-4 py-3 text-white">{admin.full_name}</td>
                  <td className="px-4 py-3 text-gray-300">{admin.email}</td>
                  <td className="px-4 py-3">
                    {admin.admin_expires_at == null ? (
                      <span className="badge-primary">Permanent</span>
                    ) : isExpired(admin) ? (
                      <span className="badge-neutral" title={formatDateTime(admin.admin_expires_at)}>
                        Expired
                      </span>
                    ) : (
                      <span className="badge-warning">
                        Until {formatDateTime(admin.admin_expires_at)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {admin.id !== user?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => setDemoteTarget(admin)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Demote
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={demoteTarget !== null} onOpenChange={(open) => !open && setDemoteTarget(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Demote {demoteTarget?.full_name}?</DialogTitle>
            <DialogDescription>
              They will immediately lose admin access across the entire platform. This cannot be
              undone from here — grant them admin again to restore it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDemoteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDemote} disabled={demoting}>
              {demoting ? "Demoting..." : "Demote Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
