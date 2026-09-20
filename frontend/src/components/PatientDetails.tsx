/**
 * Legacy PatientDetails — thin wrapper around the unified Patient Workspace.
 * Prefer importing PatientWorkspace directly in new code.
 */
import { Patient } from "@/data/mockData";
import { PatientWorkspace } from "@/components/patient/PatientWorkspace";
import type { WorkspaceRole } from "@/components/patient/workspaceUtils";

interface PatientDetailsProps {
  patient: Patient;
  role?: WorkspaceRole;
  className?: string;
}

export const PatientDetails = ({ patient, role, className }: PatientDetailsProps) => {
  return <PatientWorkspace patient={patient} role={role} className={className} />;
};

export default PatientDetails;
