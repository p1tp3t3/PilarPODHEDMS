import { ProgramService } from "../services/program-service";

export const userType = [
    { val: "super_admin", label: 'IT Admin' },
    { val: "student", label: "Student" },
    { val: "sub_admin", label: "Prefect" },
    { val: "teaching_staff", label: "Teaching Staff" },
    { val: "non_teaching_staff", label: "Non-Teaching Staff" },
    { val: "guard", label: "Guard" },
    { val: "guidance", label: "Guidance" },
    { val: "parent", label: "Parent" },
];
export const requestType = [
    { val: "complaint", label: 'Complaint' },
    { val: "referral", label: "Referral" },
    { val: "absent_form", label: "Absent Form" },
    { val: "appointment", label: "Appointment" },
    { val: "gatepass", label: "Gate Pass" },
]
export const transactionType = [
    { val: "complaint", label: 'Allow to Complaint' },
    { val: "referral", label: "Allow to Referral" },
    { val: "absent_form", label: "Allow to Absent Form" },
    { val: "appointment", label: "Allow to Appointment" },
    { val: "gatepass", label: "Allow to Gate Pass" },
]
export const program = (setter) => {
    ProgramService.getStudentPrograms(setter)
}