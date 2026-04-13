import { useState } from "react";
import { useNavigate } from "react-router-dom";
import hospitalLogo from "@/assets/hospital-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stethoscope, Users } from "lucide-react";

const LoginPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"choose" | "staff" | "family">("choose");
  const [staffRole, setStaffRole] = useState("admin");
  const [patientId, setPatientId] = useState("");
  const [otp, setOtp] = useState("");

  const handleStaffLogin = () => {
    const routes: Record<string, string> = {
      admin: "/admin",
      doctor: "/doctor",
      nurse: "/nurse",
      pharmacy: "/pharmacy",
      billing: "/billing",
      reception: "/reception",
    };
    navigate(routes[staffRole] || "/admin");
  };

  const handleFamilyLogin = () => {
    if (patientId.trim()) {
      navigate(`/family/${patientId.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={hospitalLogo} alt="Hospital Logo" width={72} height={72} className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">30-Second Smart Care System</h1>
          <p className="text-sm text-muted-foreground mt-1">Patient & Family Experience Platform</p>
        </div>

        {mode === "choose" && (
          <div className="space-y-3 animate-fade-in">
            <Button onClick={() => setMode("staff")} className="w-full h-14 text-base gap-3" variant="default">
              <Stethoscope className="h-5 w-5" />
              Login as Hospital Staff
            </Button>
            <Button onClick={() => setMode("family")} className="w-full h-14 text-base gap-3" variant="outline">
              <Users className="h-5 w-5" />
              Login as Family
            </Button>
          </div>
        )}

        {mode === "staff" && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">Staff Login</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Role</Label>
                <select value={staffRole} onChange={e => setStaffRole(e.target.value)} className="w-full mt-1.5 h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="admin">Admin / Dashboard</option>
                  <option value="reception">Reception / Registration</option>
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="billing">Billing / Finance</option>
                </select>
              </div>
              <div>
                <Label>Username</Label>
                <Input placeholder="Enter username" className="mt-1.5" />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" placeholder="Enter password" className="mt-1.5" />
              </div>
              <Button onClick={handleStaffLogin} className="w-full">Login</Button>
              <button onClick={() => setMode("choose")} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">← Back</button>
            </CardContent>
          </Card>
        )}

        {mode === "family" && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">Family Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Patient ID</Label>
                <Input placeholder="e.g. P1001" value={patientId} onChange={e => setPatientId(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Mobile OTP</Label>
                <Input placeholder="Enter 6-digit OTP" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} className="mt-1.5" />
              </div>
              <Button onClick={handleFamilyLogin} className="w-full">Access Patient Info</Button>
              <button onClick={() => setMode("choose")} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">← Back</button>
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
