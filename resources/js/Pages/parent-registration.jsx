import ParentRegistrationForm from "@/Components/parent-registration-form";
import { Head } from "@inertiajs/react";
import "./style.css";
import { useState } from "react";
import { showOutputModal, toTitleCase } from "@/others/function";
import background from '@/images/bg-pilar2.jpg'
import { FamilyService } from "@/others/services/family-service";
import { ReloadProvider, useReload } from "@/context-provider/reload-provider";

const ParentRegistration = (props) => (
    <ReloadProvider>
        <ParentRegistrationInner {...props} />
    </ReloadProvider>
);

const ParentRegistrationInner = (props) => {
    const [data, setData] = useState({
        first_name: "",
        middle_name: "",
        last_name: "",
        parent_role: "",
        sex: "",
        email: "",
        contact_number: "",
        family_code: "",
        reason: "",
        children: [],
    });

    const { loadRegister } = useReload();
    const [validationErr, setValidationError] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [existEmail, setExistEmail] = useState(false)

    const handleChange = (e) => {
        setData({ ...data, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const errors = {};

        setValidationError(errors);

        if (Object.keys(errors).length > 0) return;
        if (submitting) return; // avoid double submit

        setSubmitting(true);
        loadRegister(true, "text-wait", "Your Details Are Processing.");
        FamilyService.sendParentRegistration(
            {
                name: toTitleCase(data.first_name + ' ' + data.middle_name + ' ' + data.last_name),
                email: data.email,
                parent_details: {
                    first_name: data.first_name,
                    middle_name: data.middle_name,
                    last_name: data.last_name,
                    sex: data.sex,
                    parent_role: data.parent_role,
                    contact_number: data.contact_number,
                    family_code: data.family_code,
                    reason: data.reason,
                    children: data.children,
                },
                reason: data.reason,
            },
            () => {
                showOutputModal("A Confirmation Link Has Been Sent To Your Email. Please Click It To Submit Your Request For Admin Approval.", "s", () => {
                    loadRegister(false)
                    window.location.href = '/';
                });
            },
            () => {
                showOutputModal("There Was An Error While Processing Your Details. Please Try Again.", "e", () => {
                    loadRegister(false)
                    setSubmitting(false)
                });
            }
        )
    };

    return (
        <>
            <Head title="Pilar College Prefect of Discipline of the Higher Education Department" />
            <div className="w-full h-full">
                <div className="flex w-full h-full">
                    <div className="hidden md:block w-full h-full sticky top-0">
                        <div className="absolute w-full h-full bg-[#000000a6]"></div>
                        <p className="text-white text-[3em] font-bold absolute frm px-10 mt-10">Welcome! Praised Be Jesus And Mary</p>
                        <img src={background} alt="" srcset="" className="object-cover h-[100vh]" />
                    </div>
                    <ParentRegistrationForm
                        submit={handleSubmit}
                        data={data}
                        programs={props.programs}
                        setData={setData}
                        onchange={handleChange}
                        validationErr={validationErr}
                        setExistEmail={setExistEmail}
                    />
                </div>
            </div>
        </>
    );
};

export default ParentRegistration