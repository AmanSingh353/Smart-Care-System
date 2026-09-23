/** Connected hospital network identity — persisted (Mongo or file store). */

export const HOSPITAL_STATUSES = ["ONLINE", "BUSY", "OFFLINE"] as const;
export type HospitalStatus = (typeof HOSPITAL_STATUSES)[number];

export interface Hospital {
  id: string;
  hospitalId: string;
  hospitalName: string;
  registrationId: string;
  address: string;
  city: string;
  state: string;
  contactPhone: string;
  contactEmail: string;
  departments: string[];
  facilities: string[];
  emergencySupport: boolean;
  status: HospitalStatus;
  /** True for the hospital represented by this SCS deployment (from env). */
  isLocal: boolean;
  createdAt: string;
  updatedAt: string;
}

export function normalizeHospitalStatus(raw: string): HospitalStatus | null {
  const key = raw.trim().toUpperCase();
  return (HOSPITAL_STATUSES as readonly string[]).includes(key) ? (key as HospitalStatus) : null;
}

export function toPublicHospital(h: Hospital) {
  return {
    id: h.id,
    hospitalId: h.hospitalId,
    hospitalName: h.hospitalName,
    registrationId: h.registrationId,
    address: h.address,
    city: h.city,
    state: h.state,
    contactPhone: h.contactPhone,
    contactEmail: h.contactEmail,
    departments: h.departments,
    facilities: h.facilities,
    emergencySupport: h.emergencySupport,
    status: h.status,
    isLocal: h.isLocal,
    createdAt: h.createdAt,
    updatedAt: h.updatedAt,
  };
}
