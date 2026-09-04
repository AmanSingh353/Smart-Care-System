import React, { useState, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import hospitalLogo from "@/assets/hospital-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
<<<<<<< HEAD
import { Stethoscope, Users } from "lucide-react";
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
=======
import { Stethoscope, Users, UserPlus } from "lucide-react";
>>>>>>> e0ea6208b597f1c38a568699f8bf863394a2f0fb

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={hospitalLogo} alt="Hospital Logo" width={72} height={72} className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">30-Second Smart Care System</h1>
          <p className="text-sm text-muted-foreground mt-1">SCS30 · Connected Hospital MVP</p>
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
            <Button onClick={() => navigate("/register")} className="w-full h-14 text-base gap-3 bg-success hover:bg-success/90 text-success-foreground border-none">
              <UserPlus className="h-5 w-5" />
              New Patient Registration
            </Button>
          </div>
        )}

        {mode === "staff" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Staff Login</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Role</Label>
<<<<<<< HEAD
                <select
                  value={staffRole}
                  onChange={e => setStaffRole(e.target.value as StaffRole)}
                  className="w-full mt-1.5 h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="admin">Admin</option>
=======
                <select value={staffRole} onChange={(e: ChangeEvent<HTMLSelectElement>) => setStaffRole(e.target.value)} className="w-full mt-1.5 h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="admin">Admin / Dashboard</option>
>>>>>>> e0ea6208b597f1c38a568699f8bf863394a2f0fb
                  <option value="reception">Reception / Registration</option>
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="lab">Laboratory</option>
                  <option value="billing">Billing / Finance</option>
                </select>
              </div>
              <p className="text-xs text-muted-foreground">
                Demo mode — no password required. Role controls which screens you can access.
              </p>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Family Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Patient ID</Label>
<<<<<<< HEAD
                <Input
                  placeholder="e.g. SCS-1001"
                  value={patientId}
                  onChange={e => setPatientId(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Try demo IDs: SCS-1001 (under treatment), SCS-1002 (awaiting test), SCS-1004 (registered), SCS-1005 (ready for discharge).
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
=======
                <Input placeholder="e.g. P1001" value={patientId} onChange={(e: ChangeEvent<HTMLInputElement>) => setPatientId(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Mobile OTP</Label>
                <Input placeholder="Enter 6-digit OTP" value={otp} onChange={(e: ChangeEvent<HTMLInputElement>) => setOtp(e.target.value)} maxLength={6} className="mt-1.5" />
              </div>
              <Button onClick={handleFamilyLogin} className="w-full">Access Patient Info</Button>
              <button onClick={() => setMode("choose")} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">← Back</button>
>>>>>>> e0ea6208b597f1c38a568699f8bf863394a2f0fb
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground mt-8">
          Smart Care Hospital © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
