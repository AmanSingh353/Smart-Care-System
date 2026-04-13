import { useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { FamilyLayout } from "@/components/FamilyLayout";
import { usePatients } from "@/contexts/PatientContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Bell, ChevronDown, ChevronUp, Stethoscope, Pill, FlaskConical, Receipt } from "lucide-react";

const FamilyDashboard = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const { getPatient, addFamilyRequest } = usePatients();
  const [expandedBill, setExpandedBill] = useState(false);
  const [requestType, setRequestType] = useState<string | null>(null);
  const [requestReason, setRequestReason] = useState("");

  const patient = getPatient(patientId || "");

  if (!patient) {
    return <Navigate to="/" replace />;
  }

  const billTotal = patient.billItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const unreadNotifications = patient.notifications.filter(n => !n.read).length;

  const handleSubmitRequest = () => {
    if (requestType && requestReason.trim()) {
      addFamilyRequest(patient.id, requestType, requestReason);
      setRequestType(null);
      setRequestReason("");
    }
  };

  return (
    <FamilyLayout>
      {/* Patient header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-foreground">{patient.name}</h2>
          <p className="text-sm text-muted-foreground">{patient.id} · {patient.age}y · {patient.gender}</p>
        </div>
        <Badge variant={patient.status === "Active" ? "default" : "outline"}>{patient.status === "Active" ? "In Treatment" : "Discharged"}</Badge>
      </div>

      <div className="space-y-6">
        {/* Patient Condition */}
        <section id="info">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Stethoscope className="h-4 w-4" /> Patient Condition
          </h3>
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Diagnosis</p>
                <p className="text-sm text-foreground">{patient.diagnosis || "Pending..."}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><Pill className="h-3 w-3" /> Medicines</p>
                {patient.medicines.length > 0 ? (
                  <div className="space-y-1.5">
                    {patient.medicines.map(m => (
                      <div key={m.id} className="text-sm text-foreground bg-muted/50 rounded px-3 py-1.5">
                        <span className="font-medium">{m.name}</span> – {m.dosage}, {m.frequency}, {m.duration}
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">No medicines yet</p>}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><FlaskConical className="h-3 w-3" /> Tests</p>
                <div className="flex flex-wrap gap-2">
                  {patient.tests.map((t, i) => <Badge key={i} variant="secondary">{t}</Badge>)}
                  {patient.tests.length === 0 && <p className="text-sm text-muted-foreground">No tests yet</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Live Bill */}
        <section id="bill">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Receipt className="h-4 w-4" /> Live Bill
          </h3>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-foreground font-medium">Current Bill</span>
                <span className="text-xl font-bold text-primary">₹{billTotal.toLocaleString("en-IN")}</span>
              </div>
              <button onClick={() => setExpandedBill(!expandedBill)} className="text-xs text-primary flex items-center gap-1 hover:underline">
                {expandedBill ? "Hide" : "Show"} details
                {expandedBill ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {expandedBill && (
                <table className="w-full text-sm mt-3 animate-fade-in">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 font-medium text-muted-foreground">Item</th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patient.billItems.map((item, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="py-1.5 text-foreground">{item.description}</td>
                        <td className="py-1.5 text-right text-foreground">₹{(item.unitPrice * item.quantity).toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border">
                      <td className="pt-2 font-bold text-foreground">Total</td>
                      <td className="pt-2 text-right font-bold text-primary">₹{billTotal.toLocaleString("en-IN")}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Family Requests */}
        <section id="requests">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Family Requests</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {["Upgrade Bed", "Add Extra Nurse", "Request Special Services"].map(type => (
              <Button key={type} variant={requestType === type ? "default" : "outline"} size="sm" onClick={() => setRequestType(requestType === type ? null : type)} className="w-full">
                {type}
              </Button>
            ))}
          </div>
          {requestType && (
            <Card className="animate-fade-in mb-4">
              <CardContent className="pt-4 space-y-3">
                <div>
                  <Label className="text-xs">Request: {requestType}</Label>
                  <Textarea value={requestReason} onChange={e => setRequestReason(e.target.value)} placeholder="Reason for your request..." rows={3} className="mt-1.5" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSubmitRequest}>Submit Request</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setRequestType(null); setRequestReason(""); }}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}
          {patient.requests.length > 0 && (
            <div className="space-y-2">
              {patient.requests.map(r => (
                <div key={r.id} className="text-sm bg-muted/50 rounded-md px-3 py-2 flex items-center justify-between">
                  <span className="text-foreground">{r.type} – {r.reason}</span>
                  <Badge variant="secondary" className="text-xs">{r.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Notifications */}
        <section id="notifications">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
            {unreadNotifications > 0 && (
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">{unreadNotifications}</span>
            )}
          </h3>
          <Card>
            <CardContent className="pt-4">
              {patient.notifications.length > 0 ? (
                <div className="space-y-2">
                  {[...patient.notifications].reverse().map(n => (
                    <div key={n.id} className={`text-sm rounded-md px-3 py-2 ${n.read ? "bg-background" : "bg-primary/5 border border-primary/10"}`}>
                      <p className="text-foreground">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No notifications yet</p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </FamilyLayout>
  );
};

export default FamilyDashboard;
