import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth, ROLE_LABELS } from "@/contexts/AuthContext";
import { UserCircle } from "lucide-react";

/** Read-only staff profile — role cannot be changed by the staff member. */
export function StaffProfileCard() {
  const { staff, role } = useAuth();
  if (!staff || !role || role === "family") return null;

  return (
    <Card className="rounded-2xl shadow-card mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <UserCircle className="h-4 w-4 text-primary" />
          My profile
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-[10px] uppercase text-muted-foreground font-semibold">Name</p>
          <p className="font-medium">{staff.fullName}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-muted-foreground font-semibold">Email</p>
          <p className="font-medium">{staff.email}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-muted-foreground font-semibold">Role</p>
          <p className="font-medium">{ROLE_LABELS[role]}</p>
          <p className="text-xs text-muted-foreground">Assigned by hospital administration — not editable here.</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-muted-foreground font-semibold">Department</p>
          <p className="font-medium">{staff.department || "—"}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-muted-foreground font-semibold">Staff ID</p>
          <p className="font-medium text-primary">{staff.staffId}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-muted-foreground font-semibold">Account status</p>
          <p className="font-medium">{staff.status}</p>
        </div>
      </CardContent>
    </Card>
  );
}
