export type OrganizationTypeOption = {
  id: string;
  name: string;
};

export const ORGANIZATION_TYPES: OrganizationTypeOption[] = [
  { id: "hospital", name: "Hospital" },
  { id: "clinic", name: "Clinic" },
  { id: "medical-practice", name: "Medical Practice" },
  { id: "pharmacy", name: "Pharmacy" },
  { id: "laboratory", name: "Laboratory" },
  { id: "imaging-centre", name: "Imaging Centre" },
  { id: "dental-practice", name: "Dental Practice" },
  { id: "physiotherapy-practice", name: "Physiotherapy Practice" },
  { id: "mental-health-centre", name: "Mental Health Centre" },
  { id: "ngo", name: "NGO" },
  { id: "university-health-centre", name: "University Health Centre" },
  { id: "corporate-wellness", name: "Corporate Wellness" },
  { id: "home-healthcare", name: "Home Healthcare" },
  { id: "medical-aid", name: "Medical Aid" },
  { id: "government-facility", name: "Government Facility" },
  { id: "other", name: "Other" },
];
