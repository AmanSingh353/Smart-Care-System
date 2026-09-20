import { useState } from "react";
import { StaffLayout } from "@/components/StaffLayout";
import { usePatients } from "@/contexts/PatientContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FlaskConical } from "lucide-react";

const LabPage = () => {
  const { patients, updateTestStatus } = usePatients();
  const [results, setResults] = useState<Record<string, string>>({});

  const openTests = patients.flatMap(p =>
    p.tests
      .filter(t => t.status !== "Completed")
      .map(t => ({ patient: p, test: t }))
  );

  const completed = patients.flatMap(p =>
    p.tests
      .filter(t => t.status === "Completed")
      .map(t => ({ patient: p, test: t }))
  );

  return (
    <StaffLayout allowedRoles={["lab", "admin", "doctor"]}>
      <h2 className="text-xl font-bold text-foreground mb-2">Laboratory</h2>
      <p className="text-sm text-muted-foreground mb-6">Update test status and publish results to the patient record</p>

      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Open requests ({openTests.length})
      </h3>
      <div className="space-y-3 mb-8">
        {openTests.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">No pending tests</CardContent>
          </Card>
        )}
        {openTests.map(({ patient, test }) => (
          <Card key={test.id}>
            <CardContent className="pt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium text-primary text-sm">{patient.id}</span>
                  <span className="text-sm text-foreground ml-2">{patient.name}</span>
                  <p className="text-sm font-semibold mt-1">{test.name}</p>
                  <p className="text-xs text-muted-foreground">Requested {test.requestedAt}</p>
                </div>
                <Badge variant="secondary">{test.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {test.status === "Pending" && (
                  <Button size="sm" variant="outline" onClick={() => updateTestStatus(patient.id, test.id, "In Progress")}>
                    Start Processing
                  </Button>
                )}
              </div>
              {(test.status === "Pending" || test.status === "In Progress") && (
                <div className="space-y-2 border-t border-border pt-3">
                  <Label className="text-xs">Result / notes</Label>
                  <Input
                    value={results[test.id] || ""}
                    onChange={e => setResults(r => ({ ...r, [test.id]: e.target.value }))}
                    placeholder="Enter result summary"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      updateTestStatus(patient.id, test.id, "Completed", results[test.id] || "Result recorded");
                      setResults(r => ({ ...r, [test.id]: "" }));
                    }}
                  >
                    Mark Completed & Publish
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Completed ({completed.length})
      </h3>
      <div className="space-y-2">
        {completed.length === 0 && (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground flex flex-col items-center gap-2">
              <FlaskConical className="h-8 w-8 opacity-30" />
              No completed tests yet
            </CardContent>
          </Card>
        )}
        {completed.map(({ patient, test }) => (
          <div key={test.id} className="text-sm bg-card border border-border rounded-md px-3 py-2 flex justify-between gap-3">
            <div>
              <span className="text-primary font-medium">{patient.id}</span>
              <span className="ml-2 font-medium">{test.name}</span>
              <p className="text-xs text-muted-foreground mt-0.5">{test.result}</p>
            </div>
            <Badge variant="outline">Completed</Badge>
          </div>
        ))}
      </div>
    </StaffLayout>
  );
};

export default LabPage;
