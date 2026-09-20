import { useState } from "react";
import { StaffLayout } from "@/components/StaffLayout";
import { usePatients } from "@/contexts/PatientContext";
import { DOCTORS, ROOMS } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Timer } from "lucide-react";

const ReceptionPage = () => {
  const { addPatient, patients } = usePatients();
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "Male",
    phone: "",
    emergencyContact: "",
    visitType: "OPD",
    roomKey: "101-A",
    doctorIndex: "0",
    allergies: "",
    symptoms: "",
  });
  const [registered, setRegistered] = useState<{ id: string; time: string; name: string } | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const set = (key: string, value: string) => {
    if (!startedAt) setStartedAt(Date.now());
    setForm(f => ({ ...f, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const doctor = DOCTORS[parseInt(form.doctorIndex, 10)] || DOCTORS[0];
    const room = ROOMS.find(r => `${r.room}-${r.bed}` === form.roomKey) || ROOMS[0];
    const patient = addPatient({
      name: form.name.trim(),
      age: parseInt(form.age, 10) || 0,
      gender: form.gender,
      phone: form.phone.trim(),
      emergencyContact: form.emergencyContact.trim() || "Not provided",
      visitType: form.visitType,
      room: room.room,
      bed: room.bed,
      assignedDoctor: doctor.name,
      department: doctor.department,
      allergies: form.allergies.trim() || "None known",
      symptoms: form.symptoms.trim(),
    });
    const elapsed = startedAt ? ((Date.now() - startedAt) / 1000).toFixed(1) : "—";
    setRegistered({ id: patient.id, time: elapsed, name: patient.name });
    setForm({
      name: "",
      age: "",
      gender: "Male",
      phone: "",
      emergencyContact: "",
      visitType: "OPD",
      roomKey: "101-A",
      doctorIndex: "0",
      allergies: "",
      symptoms: "",
    });
    setStartedAt(null);
  };

  const recent = patients.slice(0, 5);

  return (
    <StaffLayout allowedRoles={["reception", "admin"]}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">30-Second Smart Registration</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Minimal fields · instant patient ID · live hospital record
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-secondary px-3 py-2 rounded-md">
            <Timer className="h-3.5 w-3.5 text-primary" />
            Target: under 30 seconds
          </div>
        </div>

        {!registered ? (
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Patient Name *</Label>
                  <Input required value={form.name} onChange={e => set("name", e.target.value)} placeholder="Full name" className="mt-1.5" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Age *</Label>
                    <Input required type="number" min={0} max={150} value={form.age} onChange={e => set("age", e.target.value)} className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <select value={form.gender} onChange={e => set("gender", e.target.value)} className="w-full mt-1.5 h-10 rounded-md border border-input bg-background px-3 text-sm">
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Phone *</Label>
                    <Input required value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="10-digit mobile" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Emergency Contact</Label>
                    <Input value={form.emergencyContact} onChange={e => set("emergencyContact", e.target.value)} placeholder="Name · phone" className="mt-1.5" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label>Visit Type</Label>
                    <select value={form.visitType} onChange={e => set("visitType", e.target.value)} className="w-full mt-1.5 h-10 rounded-md border border-input bg-background px-3 text-sm">
                      <option>OPD</option>
                      <option>Emergency</option>
                      <option>Follow-up</option>
                    </select>
                  </div>
                  <div>
                    <Label>Room / Bed</Label>
                    <select value={form.roomKey} onChange={e => set("roomKey", e.target.value)} className="w-full mt-1.5 h-10 rounded-md border border-input bg-background px-3 text-sm">
                      {ROOMS.map(r => (
                        <option key={`${r.room}-${r.bed}`} value={`${r.room}-${r.bed}`}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Assign Doctor</Label>
                    <select value={form.doctorIndex} onChange={e => set("doctorIndex", e.target.value)} className="w-full mt-1.5 h-10 rounded-md border border-input bg-background px-3 text-sm">
                      {DOCTORS.map((d, i) => (
                        <option key={d.name} value={String(i)}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Symptoms (optional)</Label>
                    <Input value={form.symptoms} onChange={e => set("symptoms", e.target.value)} placeholder="Chief complaint" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Allergies (optional)</Label>
                    <Input value={form.allergies} onChange={e => set("allergies", e.target.value)} placeholder="e.g. Penicillin" className="mt-1.5" />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11">
                  Register Patient
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-success/30 bg-success/5">
            <CardContent className="pt-6 text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
              <div>
                <p className="text-sm text-muted-foreground">Patient ID</p>
                <p className="text-3xl font-bold text-primary">{registered.id}</p>
                <p className="text-sm text-foreground mt-1">{registered.name}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Registered in <span className="font-semibold text-foreground">{registered.time}s</span> · Record is live across Doctor, Nurse, Pharmacy & Family
              </p>
              <Button onClick={() => setRegistered(null)} variant="outline">
                Register Another Patient
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="mt-8">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Recent registrations</h3>
          <div className="space-y-2">
            {recent.map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm bg-card border border-border rounded-md px-3 py-2">
                <div>
                  <span className="font-medium text-primary">{p.id}</span>
                  <span className="text-foreground ml-2">{p.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{p.treatmentStatus}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </StaffLayout>
  );
};

export default ReceptionPage;
