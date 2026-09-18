import UpModal from "../up-modal"
import { GatePassService } from "@/others/services/gatepass-service"
import { useState, useEffect } from "react"
import { change, disablePrevDate, readableDate, readableTime, toTitleCase, formatSchoolYearSemester } from "@/others/function"
import CircleReload from "@/Components/reload/circle-reload"
import FormTextfield from "@/Components/input/form-input"
import FormButton from "@/Components/button/button"
import CheckBoxButton from "@/Components/input/checkbox"
import { ModalHeader, Section, Stat, StatGrid, PersonList } from "./view-modal-parts"
import {
    CalendarClock,
    CheckCircle2,
    XCircle,
    Ban,
    Undo2,
    UserCircle2,
    MessageSquareText,
    DoorOpen,
    FileWarning,
} from "lucide-react"

const STATUS_STYLES = {
    pending: 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-200',
    approved: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200',
    expired: 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-300',
    rejected: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
    revoked: 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-300',
}

const statusFor = (info) => {
    if (info.revoked_at) return 'revoked'
    if (info.rejected_at) return 'rejected'
    if (info.confirmed_at) {
        return (info.date_expiration && new Date(info.date_expiration) < new Date()) ? 'expired' : 'approved'
    }
    return 'pending'
}

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
            pd={['p-0', '']}
            bgColor='bg-white'
            cntr={!props.approved}
            w='w-[36rem] max-w-[90vw]'>
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
                <div className="w-full flex justify-center py-16">
                    <CircleReload size={3} />
                </div>}
            </div>
        </UpModal>
    )
}

const Body = ({ data, handleSubmit, approved, setData2, data2, validationErr }) => {
    const info = data[0] == undefined ? data : data[0];
    const status = statusFor(info)
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

    return (
        <div>
            <ModalHeader
                title={`${toTitleCase(info.user?.profile?.first_name) || 'Student'}'s Gate Pass`}
                reference={info.gatepass_number}
                status={status}
                styles={STATUS_STYLES}
            />

            <div className="p-6 space-y-4">
                {/* Timeline stats */}
                <StatGrid>
                    <Stat icon={CalendarClock} label="Requested Since" value={`${readableDate(info.created_at)} (${readableTime(info.created_at)})`} sub={formatSchoolYearSemester(info.school_year_semester)} />
                    {info.confirmed_at &&
                    <Stat icon={CheckCircle2} label="Confirmed Since" value={`${readableDate(info.confirmed_at)} (${readableTime(info.confirmed_at)})`} sub={formatSchoolYearSemester(info.confirmed_school_year_semester)} />}
                    {info.rejected_at &&
                    <Stat icon={XCircle} label="Rejected Since" value={`${readableDate(info.rejected_at)} (${readableTime(info.rejected_at)})`} sub={formatSchoolYearSemester(info.rejected_school_year_semester)} />}
                    {info.revoked_at &&
                    <Stat icon={Undo2} label="Revoked Since" value={`${readableDate(info.revoked_at)} (${readableTime(info.revoked_at)})`} sub={formatSchoolYearSemester(info.revoked_school_year_semester)} />}
                    {info.date_expiration &&
                    <Stat icon={Ban} label="Expiration Date" value={readableDate(info.date_expiration)} />}
                </StatGrid>

                {info.rejected_reason != null &&
                <Section icon={FileWarning} title="Reason for Rejection" tone="border-red-200">
                    <div className="text-sm h-28 overflow-y-auto rounded-md bg-red-50/60 p-3 text-red-800">
                        {info.rejected_reason}
                    </div>
                </Section>}

                {status === 'revoked' &&
                <Section icon={Undo2} title="Revoked by Requester" tone="border-gray-200">
                    <p className="text-sm text-gray-600">
                        The requester withdrew this gate pass. It is kept on record and remains visible here, but is no longer active.
                    </p>
                </Section>}

                <Section icon={UserCircle2} title="User">
                    <PersonList data={info.user} emptyLabel="No user on record." />
                </Section>

                <Section icon={MessageSquareText} title="Reason for Requesting Gate Pass">
                    <div className="text-sm h-24 overflow-y-auto rounded-md bg-gray-50 p-3 text-gray-700 leading-relaxed">
                        {info.reason}
                    </div>
                </Section>

                {allowToLabel.length !== 0 &&
                <Section icon={DoorOpen} title="Allowed To">
                    <div className="flex flex-wrap gap-2">
                        {allowToLabel.map((e, i) => (
                            <span
                                key={i}
                                className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[0.8em] font-medium border border-blue-100"
                            >
                                {e}
                            </span>
                        ))}
                    </div>
                </Section>}

                {/* Approve Mode (Inputs) */}
                {approved && (
                    <form className="grid gap-5" onSubmit={handleSubmit}>
                        <div className="grid gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200">

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
        </div>
    );
};

ViewGatePassModal.Body = Body
export default ViewGatePassModal
