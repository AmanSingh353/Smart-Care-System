import { StaffLayout } from "@/components/StaffLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StaffManagement } from "@/components/admin/StaffManagement";

const StaffManagementPage = () => {
  return (
    <StaffLayout allowedRoles={["admin"]}>
      <PageHeader
        title="Staff Management"
        description="Manage hospital staff, roles and account access."
      />
      <StaffManagement />
    </StaffLayout>
  );
};

export default StaffManagementPage;
