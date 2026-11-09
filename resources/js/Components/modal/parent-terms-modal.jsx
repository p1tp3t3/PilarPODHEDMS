import UpModal from "./up-modal";
import FormButton from "../button/button";
import { Button } from "@mui/material";

// Terms and Conditions a parent/guardian must agree to before registering
// (parent-registration-form.jsx). Uses the app's UpModal, which slides up
// (a bottom sheet on phones). "I Agree" closes it and ticks the box.
export const PARENT_TERMS_VERSION = "2026-11-08";

const SECTIONS = [
    {
        title: "1. Purpose of the Account",
        body: [
            "The parent/guardian account lets you follow your child's discipline records at Pilar College: complaints, violations, sanctions, appointments, absences and gate passes, and receive notices from the Prefect of Discipline.",
            "The account is for monitoring and communication with the school only. It does not replace the school's official channels, meetings or written notices.",
        ],
    },
    {
        title: "2. Eligibility and Truthful Information",
        body: [
            "Only a parent or legal guardian of a currently enrolled student may register.",
            "You confirm that the details you give, including your name, relationship, contact number, email and your child's details, are true and complete. The school may verify them and may ask for proof of relationship or guardianship.",
            "Your registration is reviewed by the school administrator. It may be approved, denied, or later deactivated if the information turns out to be false or the relationship ends.",
        ],
    },
    {
        title: "3. Account Security",
        body: [
            "Keep your login details private. Do not share your account or let anyone else use it.",
            "You are responsible for activity done through your account. Tell the school right away if you think someone else has accessed it.",
        ],
    },
    {
        title: "4. Data Privacy",
        body: [
            "The school collects and processes your personal information and your child's records in line with the Data Privacy Act of 2012 (Republic Act No. 10173) and the school's privacy policy.",
            "Your information is used only to verify your identity and relationship, give you access to your child's records, and contact you about school matters.",
            "You may ask the school to correct your information or to deactivate your account. Some records may still be kept as required by school policy or law.",
        ],
    },
    {
        title: "5. Confidentiality of Records",
        body: [
            "Discipline records are confidential. You may see only the records of the child or children linked to your account.",
            "Do not copy, post, share or forward records, screenshots or information about other students, complainants or witnesses that you may come across.",
        ],
    },
    {
        title: "6. Proper Use",
        body: [
            "Use the system respectfully and only for its purpose. Do not try to access other accounts or records, disrupt the system, or submit false or harmful content.",
            "Concerns about a decision or a record should be raised with the Prefect of Discipline through the proper school process.",
        ],
    },
    {
        title: "7. Suspension and Changes",
        body: [
            "The school may suspend or deactivate an account that breaks these terms or school policy.",
            "These terms may be updated. Continued use of the account after an update means you accept the updated terms.",
        ],
    },
];

const ParentTermsModal = ({ open, onClose, onAgree }) => (
    <UpModal
        close={open}
        closeModal={(v) => { if (!v) onClose(); }}
        isEnableOuterClose={true}
        cntr={true}
        pd={["px-6", "py-5"]}
        bgColor="bg-white"
        w="w-[40rem]"
    >
        <div className="w-full grid gap-4" role="dialog" aria-modal="true" aria-labelledby="parent-terms-title">
            <div className="border-b pb-3 pr-6">
                <h2 id="parent-terms-title" className="text-xl font-semibold text-gray-800">Terms and Conditions</h2>
            </div>

            {/* The text scrolls between the title and the buttons. */}
            <div className="md:max-h-[60vh] md:overflow-y-auto md:pr-2 grid gap-4 text-[0.85em] text-gray-700 leading-relaxed">
                <p>
                    Please read these terms before registering for a parent/guardian account in the Pilar College
                    Prefect of Discipline system. By ticking the box and registering, you agree to them.
                </p>
                {SECTIONS.map((s) => (
                    <section key={s.title} className="grid gap-1.5">
                        <h3 className="font-semibold text-gray-900">{s.title}</h3>
                        {s.body.map((t, i) => <p key={i}>{t}</p>)}
                    </section>
                ))}
                <p className="text-[0.9em] text-gray-500">Last updated: November 8, 2026</p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t pt-4">
                <Button
                    onClick={onClose}
                    variant="outlined"
                    color="inherit"
                    sx={{ borderRadius: "999px", px: "2rem", py: "0.5rem", fontSize: "13px" }}
                >
                    Close
                </Button>
                <FormButton label="I Agree" click={onAgree} />
            </div>
        </div>
    </UpModal>
);

export default ParentTermsModal;
