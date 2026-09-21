import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import hospitalLogo from "@/assets/hospital-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stethoscope, Users, UserPlus, ArrowLeft } from "lucide-react";
import {
  useAuth,
  formatAuthError,
  workspacePathForRole,
} from "@/contexts/AuthContext";

const LoginPage = () => {
  const navigate = useNavigate();
  const {
    loginStaffEmailPassword,
    loginStaffGoogle,
    sendPasswordReset,
    loginFamily,
    firebaseReady,
  } = useAuth();
  const [mode, setMode] = useState<"choose" | "staff" | "family" | "reset">("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [patientId, setPatientId] = useState("SCS-1001");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    if (!firebaseReady) {
      setError("Firebase is not configured. Set VITE_FIREBASE_* in the frontend environment.");
      return;
    }
    setBusy(true);
    try {
      const profile = await loginStaffEmailPassword(email, password);
      navigate(workspacePathForRole(profile.role));
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setInfo(null);
    if (!firebaseReady) {
      setError("Firebase is not configured. Set VITE_FIREBASE_* in the frontend environment.");
      return;
    }
    setBusy(true);
    try {
      const profile = await loginStaffGoogle();
      navigate(workspacePathForRole(profile.role));
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError("Enter the email for your staff account.");
      return;
    }
    if (!firebaseReady) {
      setError("Firebase is not configured.");
      return;
    }
    setBusy(true);
    try {
      await sendPasswordReset(email);
      setInfo("Password reset email sent. Check your inbox (and spam folder).");
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleFamilyLogin = () => {
    if (!patientId.trim()) return;
    const id = patientId.trim().toUpperCase();
    loginFamily(id);
    navigate(`/family/${id}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md animate-fade-in">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to platform
        </Link>

        <div className="text-center mb-8">
          <img src={hospitalLogo} alt="Smart Care System" width={64} height={64} className="mx-auto mb-4 rounded-2xl shadow-card" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Smart Care System</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter your hospital workspace</p>
        </div>

        {mode === "choose" && (
          <div className="space-y-3">
            <Button onClick={() => setMode("staff")} className="w-full h-14 text-base gap-3" variant="default">
              <Stethoscope className="h-5 w-5" />
              Login as Hospital Staff
            </Button>
            <Button onClick={() => setMode("family")} className="w-full h-14 text-base gap-3" variant="outline">
              <Users className="h-5 w-5" />
              Login as Family
            </Button>
            <Button onClick={() => navigate("/register")} className="w-full h-14 text-base gap-3" variant="secondary">
              <UserPlus className="h-5 w-5" />
              New Patient Registration
            </Button>
          </div>
        )}

        {mode === "staff" && (
          <Card className="rounded-2xl shadow-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Staff Login</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleStaffLogin} className="space-y-4">
                <div>
                  <Label htmlFor="staff-email">Email</Label>
                  <Input
                    id="staff-email"
                    type="email"
                    autoComplete="username"
                    placeholder="doctor@smartcare.demo"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="mt-1.5 h-11 rounded-xl"
                    disabled={busy}
                  />
                </div>
                <div>
                  <Label htmlFor="staff-password">Password</Label>
                  <Input
                    id="staff-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="mt-1.5 h-11 rounded-xl"
                    disabled={busy}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {info && <p className="text-sm text-success">{info}</p>}
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Signing in…" : "Sign In"}
                </Button>
              </form>

              <button
                type="button"
                className="w-full text-center text-sm text-primary hover:underline"
                onClick={() => {
                  setError(null);
                  setInfo(null);
                  setMode("reset");
                }}
              >
                Forgot password?
              </button>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button type="button" variant="outline" className="w-full" onClick={handleGoogle} disabled={busy}>
                Continue with Google
              </Button>

              <p className="text-xs text-muted-foreground">
                Roles are assigned by your hospital administrator. Google sign-in only works for registered staff accounts.
              </p>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode("choose");
                }}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back
              </button>
            </CardContent>
          </Card>
        )}

        {mode === "reset" && (
          <Card className="rounded-2xl shadow-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Reset password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <Label htmlFor="reset-email">Staff email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="mt-1.5 h-11 rounded-xl"
                    disabled={busy}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {info && <p className="text-sm text-foreground">{info}</p>}
                <Button type="submit" className="w-full" disabled={busy}>
                  Send reset email
                </Button>
              </form>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setInfo(null);
                  setMode("staff");
                }}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back to sign in
              </button>
            </CardContent>
          </Card>
        )}

        {mode === "family" && (
          <Card className="rounded-2xl shadow-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Family Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Patient ID</Label>
                <Input
                  placeholder="e.g. SCS-1001"
                  value={patientId}
                  onChange={e => setPatientId(e.target.value)}
                  className="mt-1.5 h-11 rounded-xl"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Family access is separate from staff accounts. Use the Patient ID from Reception registration.
              </p>
              <Button onClick={handleFamilyLogin} className="w-full">
                Access Patient Info
              </Button>
              <button
                type="button"
                onClick={() => setMode("choose")}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
