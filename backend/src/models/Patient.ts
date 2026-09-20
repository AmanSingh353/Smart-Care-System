/** Placeholder patient model shape for future MongoDB / Mongoose integration. */
export interface PatientDocument {
  id: string;
  name: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}
