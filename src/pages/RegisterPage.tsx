import React, { useState, ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { usePatients } from "@/contexts/PatientContext";
import hospitalLogo from "@/assets/hospital-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, UserPlus, ArrowLeft } from "lucide-react";

const RegisterPage = () => {
  const navigate = useNavigate();
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
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={hospitalLogo} alt="Hospital Logo" width={64} height={64} className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">30-Second Smart Care</h1>
          <p className="text-sm text-muted-foreground mt-1">Quick Self-Registration</p>
        </div>

        {!registered ? (
          <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-xl border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Patient Registration
              </CardTitle>
              <CardDescription>Enter details for immediate care coordination</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name"
                    required 
                    value={form.name} 
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, name: e.target.value }))} 
                    placeholder="John Doe" 
                    className="mt-1.5 h-11" 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="age">Age</Label>
                    <Input 
                      id="age"
                      required 
                      type="number" 
                      min={0} 
                      max={150} 
                      value={form.age} 
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, age: e.target.value }))} 
                      placeholder="Age" 
                      className="mt-1.5 h-11" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender">Gender</Label>
                    <select 
                      id="gender"
                      value={form.gender} 
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, gender: e.target.value }))} 
                      className="w-full mt-1.5 h-11 rounded-md border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <Input 
                    id="mobile"
                    required 
                    value={form.mobile} 
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, mobile: e.target.value }))} 
                    placeholder="10-digit mobile" 
                    className="mt-1.5 h-11" 
                  />
                </div>

                <div>
                  <Label htmlFor="visitType">Type of Visit</Label>
                  <select 
                    id="visitType"
                    value={form.visitType} 
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, visitType: e.target.value }))} 
                    className="w-full mt-1.5 h-11 rounded-md border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                  >
                    <option>OPD</option>
                    <option>Emergency</option>
                    <option>Follow-up</option>
                  </select>
                </div>

                <Button type="submit" className="w-full h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all active:scale-[0.98]">
                  Complete Registration
                </Button>
                
                <button 
                  type="button"
                  onClick={() => navigate("/")} 
                  className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="animate-in zoom-in duration-500 border-2 border-green-100 bg-green-50/30">
            <CardContent className="pt-8 text-center space-y-6">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-800">Registration Successful!</h3>
                <p className="text-sm text-green-600 mt-1">Your record has been prioritized.</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl border border-green-200 shadow-sm mx-auto">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Your Patient ID</p>
                <p className="text-4xl font-black text-primary my-2">{registered.id}</p>
                <p className="text-xs text-muted-foreground italic">Save this ID for tracking and billing</p>
              </div>

              <div className="space-y-3 pt-2">
                <Button onClick={() => navigate("/")} className="w-full h-12 shadow-md">
                  Go to Login Dashboard
                </Button>
                <Button onClick={() => setRegistered(null)} variant="ghost" className="w-full">
                  Register Another Patient
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground mt-8">
          Smart Care Hospital © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
