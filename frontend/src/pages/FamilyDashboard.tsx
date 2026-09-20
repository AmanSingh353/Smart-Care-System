import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { FamilyLayout } from "@/components/FamilyLayout";
import { PatientWorkspace } from "@/components/patient/PatientWorkspace";
import { usePatients } from "@/contexts/PatientContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { normalizePatientId } from "@/data/mockData";

const FamilyDashboard = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const { role, patientId: authPatientId, logout } = useAuth();
  const { getPatientById, addFamilyRequest, markAllNotificationsRead } = usePatients();
  const [requestType, setRequestType] = useState<string | null>(null);
  const [requestReason, setRequestReason] = useState("");

  const allowed = authPatientId ? normalizePatientId(authPatientId) : "";
  const requested = normalizePatientId(patientId || "");
  const patient = allowed ? getPatientById(allowed) : undefined;

  useEffect(() => {
    if (patient?.id) {
      const timer = setTimeout(() => markAllNotificationsRead(patient.id), 1500);
      return () => clearTimeout(timer);
    }
  }, [patient?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!role || role !== "family" || !authPatientId) {
    return <Navigate to="/login" replace />;
  }

  if (requested && requested !== allowed) {
    return <Navigate to={`/family/${allowed}`} replace />;
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 bg-canvas">
        <p className="text-sm text-muted-foreground text-center">
          No patient record found for your family session ({allowed}).
        </p>
        <button type="button" onClick={logout} className="text-sm text-primary hover:underline">
          Back to login
        </button>
      </div>
    );
  }

  const familyNotifications = patient.notifications.filter(
    n =>
      n.type === "family" ||
      n.type === "medicine" ||
      n.type === "test" ||
      n.type === "billing" ||
      n.type === "status" ||
      n.type === "registration" ||
      !n.type
  );

  const handleSubmitRequest = () => {
    if (requestType && requestReason.trim()) {
      addFamilyRequest(patient.id, requestType, requestReason);
      setRequestType(null);
      setRequestReason("");
    }
  };

  return (
    <FamilyLayout>
      <PatientWorkspace patient={patient} role="family" />

      <section id="requests" className="mt-6 space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Family requests</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {["Upgrade Bed", "Add Extra Nurse", "Request Special Services"].map(type => (
            <Button
              key={type}
              variant={requestType === type ? "default" : "outline"}
              size="sm"
              onClick={() => setRequestType(requestType === type ? null : type)}
              className="w-full"
            >
              {type}
            </Button>
          ))}
        </div>
        {requestType && (
          <Card className="rounded-2xl shadow-card">
            <CardContent className="pt-4 space-y-3">
              <div>
                <Label className="text-xs">Request: {requestType}</Label>
                <Textarea
                  value={requestReason}
                  onChange={e => setRequestReason(e.target.value)}
                  placeholder="Reason for your request..."
                  rows={3}
                  className="mt-1.5"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSubmitRequest}>
                  Submit request
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setRequestType(null);
                    setRequestReason("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        {patient.requests.length > 0 && (
          <div className="space-y-2">
            {patient.requests.map(r => (
              <div
                key={r.id}
                className="text-sm bg-muted/50 rounded-xl px-3 py-2 flex items-center justify-between gap-2"
              >
                <span>
                  {r.type} – {r.reason}
                </span>
                <Badge variant="secondary" className="text-xs shrink-0 rounded-full">
                  {r.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </section>

      <section id="notifications" className="mt-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Care updates
        </h3>
        <Card className="rounded-2xl shadow-card">
          <CardContent className="pt-4 space-y-2">
            {familyNotifications.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No updates yet</p>
            )}
            {[...familyNotifications].reverse().map(n => (
              <div
                key={n.id}
                className={`text-sm rounded-xl px-3 py-2 ${
                  n.read ? "bg-background" : "bg-primary/5 border border-primary/10"
                }`}
              >
                <p>{n.message}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </FamilyLayout>
  );
};

export default FamilyDashboard;
