import { useState } from "react";
import { StaffLayout } from "@/components/StaffLayout";
import { usePatients } from "@/contexts/PatientContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

const ReceptionPage = () => {
  const { addPatient } = usePatients();
  const [form, setForm] = useState({ name: "", age: "", gender: "Male", mobile: "", visitType: "OPD" });
  const [registered, setRegistered] = useState<{ id: string; time: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = addPatient({
      name: form.name,
      age: parseInt(form.age),
      gender: form.gender,
      mobile: form.mobile,
      visitType: form.visitType,
    });
    setRegistered({ id: patient.id, time: new Date().toLocaleString("en-IN") });
    setForm({ name: "", age: "", gender: "Male", mobile: "", visitType: "OPD" });
  };

  return (
    <StaffLayout>
      <div className="max-w-xl mx-auto">
        <h2 className="text-xl font-bold text-foreground mb-6">Patient Registration</h2>

        {!registered ? (
          <Card className="animate-fade-in">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Patient Name</Label>
                  <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" className="mt-1.5" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Age</Label>
                    <Input required type="number" min={0} max={150} value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} placeholder="Age" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className="w-full mt-1.5 h-10 rounded-md border border-input bg-background px-3 text-sm">
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label>Mobile Number</Label>
                  <Input required value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} placeholder="10-digit mobile" className="mt-1.5" />
                </div>
                <div>
                  <Label>Visit Type</Label>
                  <select value={form.visitType} onChange={e => setForm(f => ({ ...f, visitType: e.target.value }))} className="w-full mt-1.5 h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option>OPD</option>
                    <option>Emergency</option>
                    <option>Follow-up</option>
                  </select>
                </div>
                <Button type="submit" className="w-full">Register Patient (30-Second Flow)</Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="animate-fade-in border-success/30 bg-success/5">
            <CardContent className="pt-6 text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
              <div>
                <p className="text-sm text-muted-foreground">Patient ID</p>
                <p className="text-3xl font-bold text-primary">{registered.id}</p>
              </div>
              <p className="text-xs text-muted-foreground">Registered at {registered.time}</p>
              <p className="text-sm text-foreground">Patient record created and sent to Doctor panel</p>
              <Button onClick={() => setRegistered(null)} variant="outline">Register Another Patient</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </StaffLayout>
  );
};

export default ReceptionPage;
