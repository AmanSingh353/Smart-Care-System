import { Patient, roomLabel } from "@/data/mockData";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PatientHeaderProps {
  patient: Patient;
  actions?: ReactNode;
  className?: string;
  /** Family view: hide phone / emergency contact */
  familyMode?: boolean;
}

export function PatientHeader({ patient, actions, className, familyMode = false }: PatientHeaderProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.06] to-card shadow-card p-4 md:p-5",
        className
      )}
    >
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        <div className="h-12 w-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <User className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">{patient.name}</h2>
            <StatusBadge status={patient.treatmentStatus} />
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-primary">{patient.id}</span>
            {" · "}
            {patient.age} · {patient.gender}
            {" · "}
            {patient.visitType}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>
              {patient.assignedDoctor || "Unassigned"}
              {patient.department ? ` · ${patient.department}` : ""}
            </span>
            {(patient.room || patient.bed) && <span>{roomLabel(patient)}</span>}
            {!familyMode && patient.phone && <span>{patient.phone}</span>}
            {!familyMode && patient.emergencyContact && (
              <span>Emergency: {patient.emergencyContact}</span>
            )}
          </div>
          {patient.allergies && patient.allergies !== "None known" && (
            <p className="text-xs font-semibold text-destructive bg-destructive/10 inline-flex rounded-full px-2.5 py-1">
              Allergies: {patient.allergies}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2 shrink-0 lg:justify-end">{actions}</div>}
      </div>
    </div>
  );
}
