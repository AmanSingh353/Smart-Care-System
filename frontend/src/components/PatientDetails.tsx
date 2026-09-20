import { Patient, roomLabel, getBillTotal } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PatientDetailsProps {
  patient: Patient | null | undefined;
  /** Compact hides medicines/tests tables for sidebar use */
  compact?: boolean;
  showBilling?: boolean;
  className?: string;
}

const Empty = ({ label }: { label: string }) => (
  <p className="text-sm text-muted-foreground">{label}</p>
);

/**
 * Reusable unified patient record view.
 * Always receives a patient from central PatientContext — never hardcoded data.
 */
export const PatientDetails = ({
  patient,
  compact = false,
  showBilling = false,
  className = "",
}: PatientDetailsProps) => {
  if (!patient) {
    return (
      <Card className={className}>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Patient not found
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-4 pb-4 space-y-2 text-sm">
          <div className="flex flex-wrap gap-2 items-center">
            <Badge>{patient.id}</Badge>
            <span className="font-semibold text-foreground">{patient.name}</span>
            <span className="text-muted-foreground">
              {patient.age}y · {patient.gender}
            </span>
            <Badge variant="secondary">{patient.visitType}</Badge>
            <Badge variant="outline">{patient.treatmentStatus}</Badge>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
            <span>{patient.phone || "No phone"}</span>
            <span>{roomLabel(patient)}</span>
            <span>
              {patient.assignedDoctor || "Unassigned"}
              {patient.department ? ` · ${patient.department}` : ""}
            </span>
            <span>Emergency: {patient.emergencyContact || "Not provided"}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Admitted {new Date(patient.admissionDate).toLocaleString("en-IN")}
          </p>
        </CardContent>
      </Card>

      {!compact && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Diagnosis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground">
                  {patient.diagnosis || "No diagnosis recorded yet"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Clinical notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Symptoms: </span>
                  {patient.symptoms || "None recorded"}
                </p>
                <p>
                  <span className="text-muted-foreground">Allergies: </span>
                  {patient.allergies || "None known"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Medicines</CardTitle>
            </CardHeader>
            <CardContent>
              {(patient.medicines?.length ?? 0) === 0 ? (
                <Empty label="No medicines prescribed" />
              ) : (
                <div className="space-y-1.5">
                  {patient.medicines.map(m => (
                    <div
                      key={m.id}
                      className="flex justify-between gap-2 text-sm bg-muted/40 rounded-md px-3 py-2"
                    >
                      <span>
                        <span className="font-medium">{m.name}</span> {m.dosage} · {m.frequency}
                      </span>
                      <Badge variant={m.dispensed ? "outline" : "secondary"} className="text-xs shrink-0">
                        {m.dispensed ? "Dispensed" : "Pending"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Tests</CardTitle>
            </CardHeader>
            <CardContent>
              {(patient.tests?.length ?? 0) === 0 ? (
                <Empty label="No tests ordered" />
              ) : (
                <div className="space-y-1.5">
                  {patient.tests.map(t => (
                    <div key={t.id} className="text-sm bg-muted/40 rounded-md px-3 py-2">
                      <div className="flex justify-between gap-2">
                        <span className="font-medium">{t.name}</span>
                        <Badge
                          variant={t.status === "Completed" ? "outline" : "secondary"}
                          className="text-xs"
                        >
                          {t.status}
                        </Badge>
                      </div>
                      {t.result && <p className="text-xs text-muted-foreground mt-1">{t.result}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Recent nursing updates</CardTitle>
            </CardHeader>
            <CardContent>
              {(patient.nurseUpdates?.length ?? 0) === 0 ? (
                <Empty label="No nursing updates yet" />
              ) : (
                <div className="space-y-1.5">
                  {[...patient.nurseUpdates].reverse().slice(0, 5).map(u => (
                    <div key={u.id} className="text-sm bg-muted/40 rounded-md px-3 py-2">
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
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Billing snapshot</CardTitle>
              </CardHeader>
              <CardContent>
                {(patient.billItems?.length ?? 0) === 0 ? (
                  <Empty label="No billing items" />
                ) : (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {patient.billItems.length} items · {patient.billStatus}
                    </span>
                    <span className="font-bold text-primary">
                      ₹{getBillTotal(patient.billItems).toLocaleString("en-IN")}
                    </span>
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
