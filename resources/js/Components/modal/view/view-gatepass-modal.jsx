import SelectedUser from "@/Components/other/selected-user"
import UpModal from "../up-modal"
import { GatePassService } from "@/others/services/gatepass-service"
import { useState, useEffect } from "react"
import { change, disablePrevDate, getProfilePic, readableDate, readableTime, toTitleCase } from "@/others/function"
import CircleReload from "@/Components/reload/circle-reload"
import ActionBtn from "@/Components/button/action-btn"
import FormTextfield from "@/Components/input/form-input"
import RadioButton from "@/Components/input/radio"
import FormButton from "@/Components/button/button"
import CheckBoxButton from "@/Components/input/checkbox"


const ViewGatePassModal = (props) => {

    const [data, setData] = useState(null),
          [reload, setReload] = useState(false),
          [data2, setData2] = useState({
              expiration_date: '',
              allow_to: []
          }),
          [validationErr, setValidationErr] = useState({})

    useEffect(() => {
         if(props.close) {
            getGatePassInfo()
            setReload(true)
        }else {
            setData(null)
            setReload(false)
            props.setApprove(false)
        }
    }, [props.close])
    
    const getGatePassInfo = () => {
        GatePassService.getGatePassInfo(props.id, setData)
    }

    const handleSubmit = (e) => {
        e.preventDefault();

        let errors = {};

        if (!data2.expiration_date || data2.expiration_date.trim() === "") {
            errors.expiration_date = "Please select an expiration date.";
            errors.expiration_dateAsterisk = true;
        } else {
            const selected = new Date(data2.expiration_date);

            if (selected < disablePrevDate()) {
                errors.expiration_date = "Expiration date cannot be in the past.";
                errors.expiration_dateAsterisk = true;
            }
        }

        if (!Array.isArray(data2.allow_to) || data2.allow_to.length === 0) {
            errors.allow_to = "Please select at least one option.";
            errors.allow_toAsterisk = true;
        }

        setValidationErr(errors);

        if (Object.keys(errors).length > 0) {
            return;
        }

        props.events(props.id, "confirm-allow-to", data2);
    };


    return (
        <UpModal 
            close={props.close} 
            closeModal={props.closeModal}
            isEnableOuterClose={props.isEnableOuterClose}
            pd={props.pd}
            bgColor='bg-white'
            cntr={!props.approved}
            w='w-[30rem]'>
            <div className="w-full">
                {(data != null)
                ?
                <Body 
                    data={data} 
                    data2={data2} 
                    handleSubmit={handleSubmit} 
                    setData2={setData2} 
                    approved={props.approved} 
                    validationErr={validationErr}
                />
                :
                reload &&
                <div className="w-full flex justify-center">
                    <CircleReload size={3} />
                </div>}
            </div>
        </UpModal>
    )
}

const Body = ({ data, handleSubmit, approved, setData2, data2, validationErr }) => {
    const info = data[0] == undefined ? data : data[0];
    const allowToList = Array.isArray(info.allow_to)
        ? info.allow_to
        : typeof info.allow_to === "string"
            ? (() => {
                try {
                    const parsed = JSON.parse(info.allow_to)
                    return Array.isArray(parsed) ? parsed : [info.allow_to]
                } catch {
                    return info.allow_to.includes(",")
                        ? info.allow_to.split(",").map(e => e.trim())
                        : [info.allow_to]
                }
            })()
            : []

    const allowToLabel = allowToList.map((e) =>
        e === "go-out" ? "Go Out" : e === "enter" ? "Enter the Campus" : e
    )
    const handleAllowToChange = (e) => {
        const { value, checked } = e.target;

        setData2((prev) => ({
            ...prev,
            allow_to: checked
                ? [...prev.allow_to, value]
                : prev.allow_to.filter((item) => item !== value),
        }));
    };

    const Section = ({ label, children }) => (
        <div className="bg-gray-50 p-4 rounded-lg border">
            <p className="text-sm font-semibold text-gray-700 mb-1">{label}</p>
            <div className="text-gray-800 text-sm">{children}</div>
        </div>
    );

    return (
        <div className="grid gap-4">

            {/* Title */}
            <div className="text-center mb-2">
                <h1 className="text-xl font-bold text-gray-800">
                    {toTitleCase(info.user.profile?.first_name)}'s Gate Pass
                </h1>
            </div>

            {/* Reference No. */}
            <Section label="Reference No.">
                {info.gatepass_number}
            </Section>

            {/* User Section */}
            <Section label="User Information">
                <ProfileSection title="" data={info.user} />
            </Section>

            {/* Requested */}
            <Section label="Requested Since">
                {readableDate(info.created_at)} ({readableTime(info.created_at)})
            </Section>

            {/* Reason */}
            <Section label="Reason for Requesting Gate Pass">
                {info.reason}
            </Section>

            {/* Confirmed */}
            {info.confirmed_at && (
                <Section label="Confirmed Since">
                    {readableDate(info.confirmed_at)} ({readableTime(info.confirmed_at)})
                </Section>
            )}

            {/* Expiration */}
            {info.date_expiration && (
                <Section label="Expiration Date">
                    {readableDate(info.date_expiration)}
                </Section>
            )}

            {/* Allow To */}
            {info.allow_to && (
                <Section label="Allowed To">
                    <div className="flex flex-wrap gap-2">
                        {allowToLabel.map((e, i) => (
                            <span
                                key={i}
                                className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-[0.8em] font-medium"
                            >
                                {e}
                            </span>
                        ))}
                    </div>
                </Section>
            )}

            {/* Approve Mode (Inputs) */}
            {approved && (
                <form className="grid gap-5" onSubmit={handleSubmit}>
                    <div className="grid gap-3 bg-gray-50 p-4 rounded-lg border">

                        <FormTextfield
                            label="Expiration Date"
                            type="datetime-local"
                            name="expiration_date"
                            id="expiration_date"
                            val={data2.expiration_date}
                            change={(e) => change(e, setData2)}
                            min={disablePrevDate()}
                            error={validationErr?.expiration_date}      // <-- ✔ pass error here
                            errorAsterisk={validationErr?.expiration_dateAsterisk}               // <-- ✔ asterisk
                        />

                        <CheckBoxButton
                            label={<b>Allow To</b>}
                            list={[
                                { val: "go-out", label: "Go Out" },
                                { val: "enter", label: "Enter the Campus" },
                            ]}
                            name="allow_to"
                            id="allow_to"
                            val={data2.allow_to}
                            change={handleAllowToChange}
                        />
                        {validationErr?.allow_to && (
                            <div className="text-[#d12323] text-[0.8em]">
                                <b>{validationErr.allow_to}*</b>
                            </div>
                        )}
                    </div>

                    <FormButton type="submit" label="Save Changes" />
                </form>
            )}
        </div>
    );
};
const ProfileSection = ({ title, data }) => (
    <div className="flex items-center gap-3">
        <SelectedUser
            src={getProfilePic(data.profile?.profile_picture, data.profile?.sex)}
            name={[data.profile?.first_name, data.profile?.last_name]}
            user={data}
        />
    </div>
);


ViewGatePassModal.Body = Body
export default ViewGatePassModal