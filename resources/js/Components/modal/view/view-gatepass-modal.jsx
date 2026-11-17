import UpModal from "../up-modal"
import { GatePassService } from "@/others/services/gatepass-service"
import { useState, useEffect } from "react"
import { change, disablePrevDate, readableDate, readableTime, toTitleCase } from "@/others/function"
import FormTextfield from "@/Components/input/form-input"
import FormButton from "@/Components/button/button"
import CheckBoxButton from "@/Components/input/checkbox"
import {
    ModalHeader, Section, Timeline, stepAt, stepAhead, People, prefectName, useOwnerTitle, useIsOwner, ViewModalSkeleton,
    Pill, TextBox, Text, RecordBody,
} from "./view-modal-parts"
import { Validator } from "@/others/classes/validator"
import { Box, Paper, Stack, Typography } from "@mui/material"
import {
    Undo2,
    MessageSquareText,
    DoorOpen,
} from "lucide-react"

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

        const errors = Validator.gatePassApproval(data2, disablePrevDate());
        setValidationErr(errors);
        if (Validator.hasErrors(errors)) return;

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
            <Box sx={{ width: "100%" }}>
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
                <ViewModalSkeleton variant="record" />}
            </Box>
        </UpModal>
    )
}

// Every step a gate pass goes through: Requested -> Approved -> Expires.
// A rejection ends it; a revoke stops it.
const stepsFor = (d) => {
    const steps = [stepAt("Requested", d.created_at, d.school_year_semester)]
    if (d.rejected_at) return [...steps, stepAt("Rejected", d.rejected_at, d.rejected_school_year_semester, "failed", d.rejected_reason)]
    if (d.confirmed_at) steps.push(stepAt("Approved", d.confirmed_at, d.confirmed_school_year_semester))
    else if (!d.revoked_at) steps.push(stepAhead("Approved", "Waiting for the prefect's approval"))
    if (d.revoked_at) return [...steps, stepAt("Revoked", d.revoked_at, d.revoked_school_year_semester, "stopped")]
    if (!d.date_expiration) steps.push(stepAhead("Expires", "Set when approved"))
    else if (new Date(d.date_expiration) < new Date()) steps.push(stepAt("Expired", d.date_expiration, null, "stopped"))
    else steps.push(stepAhead("Expires", `Valid until ${readableDate(d.date_expiration)} (${readableTime(d.date_expiration)})`))
    return steps
}

const Body = ({ data, handleSubmit, approved, setData2, data2, validationErr }) => {
    const info = data[0] == undefined ? data : data[0];
    const status = statusFor(info)
    const ownerId = info.user?.id ?? info.user_id
    const title = useOwnerTitle(ownerId, toTitleCase(info.user?.profile?.first_name), "Gate Pass")
    const isOwner = useIsOwner(ownerId)
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

    const when = (at) => `${readableDate(at)} (${readableTime(at)})`

    return (
        <Box>
            <ModalHeader
                title={title}
                reference={info.gatepass_number}
                person={!isOwner ? info.user : null}
                personLabel="Requested by"
                status={status}
            />

            <RecordBody>
                {/* Progress: done steps and the ones still ahead */}
                <Timeline steps={stepsFor(info)} />


                {status === 'revoked' &&
                <Section icon={Undo2} title={isOwner ? "Revoked by You" : "Revoked by Requester"}>
                    <Text>
                        The requester withdrew this gate pass. It is kept on record and remains visible here, but is no longer active.
                    </Text>
                </Section>}

                {info.prefect && <People rows={[
                    { label: "Issued by the Prefect", content: <Text>{prefectName(info.prefect)}</Text> },
                ]} />}

                <Section icon={MessageSquareText} title="Reason for Requesting Gate Pass">
                    <TextBox height={96}>{info.reason}</TextBox>
                </Section>

                {allowToLabel.length !== 0 &&
                <Section icon={DoorOpen} title="Allowed To">
                    <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
                        {allowToLabel.map((e, i) => <Pill key={i} tone="blue" label={e} sx={{ height: 26, fontWeight: 500 }} />)}
                    </Stack>
                </Section>}

                {/* Approve Mode (Inputs) */}
                {approved && (
                    <Box component="form" onSubmit={handleSubmit} sx={{ display: "grid", gap: 2.5 }}>
                        <Paper variant="outlined" sx={{ display: "grid", gap: 1.5, p: 2, borderRadius: 2, bgcolor: "action.hover" }}>

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
                                <Typography sx={{ color: "#d12323", fontSize: "0.8em", fontWeight: 700 }}>
                                    {validationErr.allow_to}*
                                </Typography>
                            )}
                        </Paper>

                        <FormButton type="submit" label="Save Changes" />
                    </Box>
                )}
            </RecordBody>
        </Box>
    );
};

ViewGatePassModal.Body = Body
export default ViewGatePassModal
