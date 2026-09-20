import { useState } from "react";
import { StaffLayout } from "@/components/StaffLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { PatientWorkspace } from "@/components/patient/PatientWorkspace";
import { usePatients } from "@/contexts/PatientContext";
import { DOCTORS, ROOMS } from "@/data/mockData";
import { CANONICAL_DEMO_PATIENT } from "@/config/demo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, ArrowLeft, Sparkles } from "lucide-react";

const ReceptionPage = () => {
  const { addPatient, patients, getPatientById } = usePatients();
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
  const [viewPatientId, setViewPatientId] = useState<string | null>(null);

  const set = (key: string, value: string) => {
    if (!startedAt) setStartedAt(Date.now());
    setForm(f => ({ ...f, [key]: value }));
  };

  const fillCanonicalDemo = () => {
    setStartedAt(Date.now());
    setForm(f => ({
      ...f,
      name: CANONICAL_DEMO_PATIENT.name,
      age: CANONICAL_DEMO_PATIENT.age,
      gender: CANONICAL_DEMO_PATIENT.gender,
      phone: CANONICAL_DEMO_PATIENT.phone,
      emergencyContact: CANONICAL_DEMO_PATIENT.emergencyContact,
      visitType: CANONICAL_DEMO_PATIENT.visitType,
      allergies: CANONICAL_DEMO_PATIENT.allergies,
      symptoms: CANONICAL_DEMO_PATIENT.symptoms,
      roomKey: "101-A",
      doctorIndex: "0",
    }));
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

  const recent = patients.slice(0, 8);
  const viewing = viewPatientId ? getPatientById(viewPatientId) : undefined;

  if (viewing) {
    return (
      <StaffLayout allowedRoles={["reception", "admin"]}>
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => setViewPatientId(null)} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Back to registration
          </Button>
        </div>
        <PatientWorkspace patient={viewing} role="reception" />
      </StaffLayout>
    );
  }

  return (
    <StaffLayout allowedRoles={["reception", "admin"]}>
      <div className="max-w-3xl mx-auto">
        <PageHeader
          title="30-Second Registration"
          description="Minimal fields · instant patient ID · live hospital record across every role."
        />

        {!registered ? (
          <Card className="rounded-2xl shadow-card">
            <CardContent className="pt-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Judge demo: use <span className="font-semibold text-foreground">{CANONICAL_DEMO_PATIENT.name}</span>
                </p>
                <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={fillCanonicalDemo}>
                  <Sparkles className="h-3.5 w-3.5" />
                  Fill canonical demo patient
                </Button>
              </div>
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
                    <select value={form.gender} onChange={e => set("gender", e.target.value)} className="w-full mt-1.5 h-10 rounded-xl border border-input bg-background px-3 text-sm">
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
                    <select value={form.visitType} onChange={e => set("visitType", e.target.value)} className="w-full mt-1.5 h-10 rounded-xl border border-input bg-background px-3 text-sm">
                      <option>OPD</option>
                      <option>Emergency</option>
                      <option>Follow-up</option>
                    </select>
                  </div>
                  <div>
                    <Label>Room / Bed</Label>
                    <select value={form.roomKey} onChange={e => set("roomKey", e.target.value)} className="w-full mt-1.5 h-10 rounded-xl border border-input bg-background px-3 text-sm">
                      {ROOMS.map(r => (
                        <option key={`${r.room}-${r.bed}`} value={`${r.room}-${r.bed}`}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Assign Doctor</Label>
                    <select value={form.doctorIndex} onChange={e => set("doctorIndex", e.target.value)} className="w-full mt-1.5 h-10 rounded-xl border border-input bg-background px-3 text-sm">
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
          <Card className="rounded-2xl border-success/30 bg-success/5 shadow-card">
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
              <p className="text-xs text-muted-foreground rounded-xl bg-background/80 border border-border px-3 py-2">
                Family login ID: <span className="font-semibold text-foreground">{registered.id}</span>
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button onClick={() => setViewPatientId(registered.id)}>Open Patient Workspace</Button>
                <Button onClick={() => setRegistered(null)} variant="outline">
                  Register Another Patient
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-8">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Recent registrations</h3>
          <div className="space-y-2">
            {recent.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setViewPatientId(p.id)}
                className="w-full flex items-center justify-between text-sm bg-card border border-border rounded-xl px-3 py-2.5 hover:bg-muted/40 transition-colors text-left"
              >
                <div>
                  <span className="font-medium text-primary">{p.id}</span>
                  <span className="text-foreground ml-2">{p.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{p.treatmentStatus}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </StaffLayout>
  );
};

export default ReceptionPage;
