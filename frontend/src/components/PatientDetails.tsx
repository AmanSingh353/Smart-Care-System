import { Patient, roomLabel, getBillTotal } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { PatientJourney } from "@/components/patient/PatientJourney";
import { CareGuardPanel } from "@/components/patient/CareGuardPanel";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

interface PatientDetailsProps {
  patient: Patient | null | undefined;
  compact?: boolean;
  showBilling?: boolean;
  showCareGuard?: boolean;
  className?: string;
}

const Empty = ({ label }: { label: string }) => (
  <p className="text-sm text-muted-foreground">{label}</p>
);

/**
 * Unified patient record — visual heart of SCS30.
 * Always receives patient data from PatientContext.
 */
export const PatientDetails = ({
  patient,
  compact = false,
  showBilling = false,
  showCareGuard = true,
  className = "",
}: PatientDetailsProps) => {
  if (!patient) {
    return (
      <Card className={cn("rounded-2xl shadow-card", className)}>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">Patient not found</CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4 animate-fade-in", className)}>
      {/* Header */}
      <Card className="rounded-2xl border-primary/15 bg-gradient-to-br from-primary/[0.06] to-card shadow-card overflow-hidden">
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <User className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-primary tracking-wide">{patient.id}</span>
                <StatusBadge status={patient.treatmentStatus} />
                <StatusBadge status={patient.visitType} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">{patient.name}</h2>
              <p className="text-sm text-muted-foreground">
                {patient.age}y · {patient.gender}
                {patient.phone ? ` · ${patient.phone}` : ""}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>{roomLabel(patient)}</span>
                <span>
                  {patient.assignedDoctor || "Unassigned"}
                  {patient.department ? ` · ${patient.department}` : ""}
                </span>
                <span>Emergency: {patient.emergencyContact || "Not provided"}</span>
                <span>Admitted {new Date(patient.admissionDate).toLocaleString("en-IN")}</span>
              </div>
            </div>
            {showBilling && (
              <div className="sm:text-right shrink-0 rounded-xl bg-card border border-border px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Bill</p>
                <p className="text-lg font-bold text-primary tabular-nums">
                  ₹{getBillTotal(patient.billItems ?? []).toLocaleString("en-IN")}
                </p>
                <StatusBadge status={patient.billStatus} className="mt-1" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!compact && (
        <>
          <PatientJourney status={patient.treatmentStatus} />

          {showCareGuard && <CareGuardPanel />}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="rounded-2xl shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Clinical summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Diagnosis</p>
                  <p>{patient.diagnosis || "No diagnosis recorded yet"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Symptoms</p>
                  <p>{patient.symptoms || "None recorded"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Allergies</p>
                  <p className={patient.allergies && patient.allergies !== "None known" ? "text-destructive font-medium" : ""}>
                    {patient.allergies || "None known"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Connected care</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: "Doctor", value: patient.assignedDoctor || "—" },
                    { label: "Department", value: patient.department || "—" },
                    { label: "Medicines", value: `${patient.medicines?.length ?? 0}` },
                    { label: "Tests", value: `${patient.tests?.length ?? 0}` },
                    { label: "Nurse notes", value: `${patient.nurseUpdates?.length ?? 0}` },
                    { label: "Payment", value: patient.billStatus },
                  ].map(row => (
                    <div key={row.label} className="rounded-xl bg-muted/50 px-3 py-2">
                      <p className="text-muted-foreground">{row.label}</p>
                      <p className="font-semibold text-foreground truncate mt-0.5">{row.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Medications</CardTitle>
            </CardHeader>
            <CardContent>
              {(patient.medicines?.length ?? 0) === 0 ? (
                <Empty label="No medicines prescribed" />
              ) : (
                <div className="space-y-2">
                  {patient.medicines.map(m => (
                    <div
                      key={m.id}
                      className="flex justify-between gap-2 text-sm rounded-xl bg-muted/40 px-3 py-2.5"
                    >
                      <span>
                        <span className="font-medium">{m.name}</span> {m.dosage} · {m.frequency}
                      </span>
                      <StatusBadge status={m.dispensed ? "Completed" : "Pending"} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Lab results</CardTitle>
            </CardHeader>
            <CardContent>
              {(patient.tests?.length ?? 0) === 0 ? (
                <Empty label="No tests ordered" />
              ) : (
                <div className="space-y-2">
                  {patient.tests.map(t => (
                    <div key={t.id} className="text-sm rounded-xl bg-muted/40 px-3 py-2.5">
                      <div className="flex justify-between gap-2">
                        <span className="font-medium">{t.name}</span>
                        <StatusBadge status={t.status} />
                      </div>
                      {t.result && <p className="text-xs text-muted-foreground mt-1">{t.result}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Activity & nursing updates</CardTitle>
            </CardHeader>
            <CardContent>
              {(patient.nurseUpdates?.length ?? 0) === 0 ? (
                <Empty label="No nursing updates yet" />
              ) : (
                <div className="space-y-2">
                  {[...patient.nurseUpdates].reverse().slice(0, 5).map(u => (
                    <div key={u.id} className="text-sm rounded-xl bg-muted/40 px-3 py-2.5">
                      <p>{u.note}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {u.nurseName} · {u.time}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {showBilling && (
            <Card className="rounded-2xl shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Billing</CardTitle>
              </CardHeader>
              <CardContent>
                {(patient.billItems?.length ?? 0) === 0 ? (
                  <Empty label="No billing items" />
                ) : (
                  <div className="space-y-2">
                    {patient.billItems.map(item => (
                      <div key={item.id} className="flex justify-between text-sm gap-3">
                        <span className="text-muted-foreground truncate">{item.description}</span>
                        <span className="font-medium tabular-nums shrink-0">
                          ₹{(item.unitPrice * item.quantity).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 border-t border-border font-bold">
                      <span>Total</span>
                      <span className="text-primary tabular-nums">
                        ₹{getBillTotal(patient.billItems).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default PatientDetails;
