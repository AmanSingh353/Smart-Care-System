import { Patient } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ClinicalSummaryProps {
  patient: Patient;
  familyMode?: boolean;
  className?: string;
}

export function ClinicalSummary({ patient, familyMode = false, className }: ClinicalSummaryProps) {
  const allergyAlert = patient.allergies && patient.allergies !== "None known";

  return (
    <Card className={cn("rounded-2xl shadow-card", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          {familyMode ? "Condition overview" : "Clinical summary"}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
        <div className="sm:col-span-2">
          <p className="text-xs text-muted-foreground mb-1">Diagnosis</p>
          <p className="font-medium text-foreground leading-relaxed">
            {patient.diagnosis || (familyMode ? "Awaiting doctor assessment…" : "No diagnosis recorded yet")}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Symptoms</p>
          <p>{patient.symptoms || "None recorded"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Allergies</p>
          <p className={allergyAlert ? "font-semibold text-destructive" : ""}>
            {patient.allergies || "None known"}
          </p>
        </div>
        {!familyMode && (
          <>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Visit type</p>
              <p>{patient.visitType}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Treatment status</p>
              <p>{patient.treatmentStatus}</p>
            </div>
          </>
        )}
        <div className="sm:col-span-2 rounded-xl bg-muted/40 border border-border/60 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-1">Vitals & medical history</p>
          <p className="text-sm text-muted-foreground">
            Not recorded in this demo dataset. Care teams can add notes via nursing updates and diagnosis fields.
          </p>
        </div>
        {(patient.nurseUpdates?.length ?? 0) > 0 && (
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground mb-1">
              {familyMode ? "Care updates" : "Latest doctor / nursing notes"}
            </p>
            <p className="text-sm">
              {[...patient.nurseUpdates].reverse()[0]?.note}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
