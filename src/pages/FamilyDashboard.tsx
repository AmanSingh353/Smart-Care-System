import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { FamilyLayout } from "@/components/FamilyLayout";
import { usePatients } from "@/contexts/PatientContext";
import { getBillTotal, roomLabel } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Bell, ChevronDown, ChevronUp, Stethoscope, Pill, FlaskConical, Receipt, Activity } from "lucide-react";

const FamilyDashboard = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const { getPatientById, addFamilyRequest, markAllNotificationsRead } = usePatients();
  const [expandedBill, setExpandedBill] = useState(false);
  const [requestType, setRequestType] = useState<string | null>(null);
  const [requestReason, setRequestReason] = useState("");

  const patient = getPatientById(patientId || "");

  useEffect(() => {
    if (patient?.id) {
      const timer = setTimeout(() => markAllNotificationsRead(patient.id), 1500);
      return () => clearTimeout(timer);
    }
  }, [patient?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!patient) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-muted-foreground">Patient not found for ID “{patientId}”.</p>
        <a href="/" className="text-sm text-primary hover:underline">
          Back to login
        </a>
      </div>
    );
  }

  const billTotal = getBillTotal(patient.billItems);
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
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">{patient.name}</h2>
          <p className="text-sm text-muted-foreground">
            {patient.id} · {patient.age}y · {patient.gender}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={patient.treatmentStatus === "Discharged" ? "outline" : "default"}>
            {patient.treatmentStatus}
          </Badge>
          <Badge variant={patient.billStatus === "Paid" ? "outline" : "secondary"} className="text-xs">
            Bill {patient.billStatus}
          </Badge>
        </div>
      </div>

      <div className="space-y-6">
        <section id="info">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Stethoscope className="h-4 w-4" /> Patient Overview
          </h3>
          <Card>
            <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Doctor / Department</p>
                <p className="text-foreground">
                  {patient.assignedDoctor}
                  <span className="text-muted-foreground"> · {patient.department}</span>
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Location</p>
                <p className="text-foreground">{roomLabel(patient)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Admission</p>
                <p className="text-foreground">{new Date(patient.admissionDate).toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Visit type</p>
                <p className="text-foreground">{patient.visitType}</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="treatment">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" /> Treatment
          </h3>
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Diagnosis</p>
                <p className="text-sm text-foreground">{patient.diagnosis || "Awaiting doctor assessment…"}</p>
              </div>
              {patient.symptoms && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Symptoms</p>
                  <p className="text-sm text-foreground">{patient.symptoms}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Pill className="h-3 w-3" /> Medicines
                </p>
                {patient.medicines.length > 0 ? (
                  <div className="space-y-1.5">
                    {patient.medicines.map(m => (
                      <div key={m.id} className="text-sm text-foreground bg-muted/50 rounded px-3 py-1.5 flex justify-between gap-2">
                        <span>
                          <span className="font-medium">{m.name}</span> – {m.dosage}, {m.frequency}
                        </span>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {m.dispensed ? "Dispensed" : "Pending"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No medicines yet</p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <FlaskConical className="h-3 w-3" /> Tests
                </p>
                {patient.tests.length > 0 ? (
                  <div className="space-y-1.5">
                    {patient.tests.map(t => (
                      <div key={t.id} className="text-sm bg-muted/50 rounded px-3 py-1.5">
                        <div className="flex justify-between gap-2">
                          <span className="font-medium">{t.name}</span>
                          <Badge variant={t.status === "Completed" ? "outline" : "secondary"} className="text-[10px]">
                            {t.status}
                          </Badge>
                        </div>
                        {t.result && <p className="text-xs text-muted-foreground mt-1">{t.result}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No tests yet</p>
                )}
              </div>
              {patient.nurseUpdates.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Important updates</p>
                  <div className="space-y-1.5">
                    {[...patient.nurseUpdates].reverse().slice(0, 5).map(u => (
                      <div key={u.id} className="text-sm bg-primary/5 border border-primary/10 rounded px-3 py-1.5">
                        <p>{u.note}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {u.nurseName} · {u.time}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section id="bill">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Receipt className="h-4 w-4" /> Billing Summary
          </h3>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-foreground font-medium">Current Bill</span>
                <span className="text-xl font-bold text-primary">₹{billTotal.toLocaleString("en-IN")}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Payment status: {patient.billStatus}</p>
              <button
                type="button"
                onClick={() => setExpandedBill(!expandedBill)}
                className="text-xs text-primary flex items-center gap-1 hover:underline"
              >
                {expandedBill ? "Hide" : "Show"} details
                {expandedBill ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {expandedBill && (
                <table className="w-full text-sm mt-3">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 font-medium text-muted-foreground">Item</th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patient.billItems.map(item => (
                      <tr key={item.id} className="border-b border-border/50 last:border-0">
                        <td className="py-1.5">{item.description}</td>
                        <td className="py-1.5 text-right">₹{(item.unitPrice * item.quantity).toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border">
                      <td className="pt-2 font-bold">Total</td>
                      <td className="pt-2 text-right font-bold text-primary">₹{billTotal.toLocaleString("en-IN")}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </CardContent>
          </Card>
        </section>

        <section id="requests">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Family Requests</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
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
            <Card className="mb-4">
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
                    Submit Request
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
                <div key={r.id} className="text-sm bg-muted/50 rounded-md px-3 py-2 flex items-center justify-between gap-2">
                  <span>
                    {r.type} – {r.reason}
                  </span>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </section>

        <section id="notifications">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
            {unreadNotifications > 0 && (
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {unreadNotifications}
              </span>
            )}
          </h3>
          <Card>
            <CardContent className="pt-4">
              {patient.notifications.length > 0 ? (
                <div className="space-y-2">
                  {[...patient.notifications].reverse().map(n => (
                    <div
                      key={n.id}
                      className={`text-sm rounded-md px-3 py-2 ${
                        n.read ? "bg-background" : "bg-primary/5 border border-primary/10"
                      }`}
                    >
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
