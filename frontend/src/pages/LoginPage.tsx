import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import hospitalLogo from "@/assets/hospital-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stethoscope, Users, UserPlus, ArrowLeft } from "lucide-react";
import { useAuth, StaffRole } from "@/contexts/AuthContext";

const ROLE_ROUTES: Record<StaffRole, string> = {
  admin: "/admin",
  doctor: "/doctor",
  nurse: "/nurse",
  pharmacy: "/pharmacy",
  billing: "/billing",
  reception: "/reception",
  lab: "/lab",
};

const LoginPage = () => {
  const navigate = useNavigate();
  const { loginStaff, loginFamily } = useAuth();
  const [mode, setMode] = useState<"choose" | "staff" | "family">("choose");
  const [staffRole, setStaffRole] = useState<StaffRole>("admin");
  const [patientId, setPatientId] = useState("SCS-1001");

  const handleStaffLogin = () => {
    loginStaff(staffRole);
    navigate(ROLE_ROUTES[staffRole]);
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
              <div>
                <Label>Select Role</Label>
                <select
                  value={staffRole}
                  onChange={e => setStaffRole(e.target.value as StaffRole)}
                  className="w-full mt-1.5 h-11 rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="admin">Admin</option>
                  <option value="reception">Reception / Registration</option>
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="lab">Laboratory</option>
                  <option value="billing">Billing / Finance</option>
                </select>
              </div>
              <p className="text-xs text-muted-foreground">Demo mode — no password required. Role controls which screens you can access.</p>
              <Button onClick={handleStaffLogin} className="w-full">
                Enter as {staffRole.charAt(0).toUpperCase() + staffRole.slice(1)}
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
                Use the Patient ID from Reception registration (canonical demo: Arjun Verma). Supporting demos: SCS-1001–1007.
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
