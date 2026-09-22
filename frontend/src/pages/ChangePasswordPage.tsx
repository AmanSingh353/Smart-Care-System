import { useState } from "react";
import { useNavigate } from "react-router-dom";
import hospitalLogo from "@/assets/hospital-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import {
  useAuth,
  formatAuthError,
  workspacePathForRole,
} from "@/contexts/AuthContext";
import { firebaseChangePassword } from "@/lib/firebase";
import { authService } from "@/services/authService";

const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const { staff, getAccessToken, logout, refreshStaffSession } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("New password must be different from the temporary password.");
      return;
    }
    setBusy(true);
    try {
      await firebaseChangePassword(currentPassword, newPassword);
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      await authService.completePasswordChange(token);
      const profile = await refreshStaffSession();
      navigate(workspacePathForRole(profile.role), { replace: true });
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <img src={hospitalLogo} alt="" className="h-10 w-10 object-contain" />
            <div>
              <CardTitle className="text-xl">Change password</CardTitle>
              <p className="text-sm text-muted-foreground">
                {staff?.email
                  ? `Required before first access for ${staff.email}`
                  : "Set a new password to continue"}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="current-password">Current (temporary) password</Label>
              <div className="relative mt-1">
                <Input
                  id="current-password"
                  type={showCurrent ? "text" : "password"}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
                  onClick={() => setShowCurrent(v => !v)}
                  aria-label={showCurrent ? "Hide password" : "Show password"}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="new-password">New password</Label>
              <div className="relative mt-1">
                <Input
                  id="new-password"
                  type={showNew ? "text" : "password"}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
                  onClick={() => setShowNew(v => !v)}
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                className="mt-1"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Updating…" : "Update password"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => logout()}>
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChangePasswordPage;
