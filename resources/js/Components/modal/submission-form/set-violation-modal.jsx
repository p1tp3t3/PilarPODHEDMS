import UpModal from "../up-modal"
import FormTextfield from "@/Components/input/form-input"
import { change, showOutputModal, showWarningModal, toTitleCase, ordinal } from "@/others/function"
import { useState, useEffect } from "react"
import FormButton from "@/Components/button/button"
import { ViolationService } from "@/others/services/violation-service"
import RadioButton from "@/Components/input/radio"
import { Select, MenuItem } from "@mui/material"

const SetViolationModal = (props) => {
    const action = props.action || "add"
    const editData = props.data || {}

    const [data, setData] = useState({
        id: "",
        violation_name: "",
        offense_status: "1",
    })

    const [penalties, setPenalties] = useState([
        { occurrence: 1, list: [{ penalty_id: "" }] },
        { occurrence: 2, list: [{ penalty_id: "" }] },
        { occurrence: 3, list: [{ penalty_id: "" }] },
        { occurrence: 4, list: [{ penalty_id: "" }] },
        { occurrence: 5, list: [{ penalty_id: "" }] },
        { occurrence: 6, list: [{ penalty_id: "" }] },
    ])

    const [validationErr, setValidationErr] = useState({
        violation_name: "",
        violation_nameAsterisk: false,
        offense_status: "",
        offense_statusAsterisk: false,
        penalties: "",
    })

    // ------------------ LOAD EDIT DATA ------------------
    useEffect(() => {
        if (action === "edit" && editData) {
            setData({
                id: editData.id || "",
                violation_name: editData.violation_name || "",
                offense_status: editData.offense_status != null ? String(editData.offense_status) : "1",
            });

            if (editData.penalties) {
                const transformed = [1, 2, 3, 4, 5, 6].map(occ => {
                    const matching = editData.penalties.filter(p => Number(p.occurrence) === occ);

                    return {
                        occurrence: occ,
                        list: matching.length > 0
                            ? matching.map(p => ({ penalty_id: String(p.penalty_id) }))
                            : [{ penalty_id: "" }]
                    };
                });

                setPenalties(transformed);
            }
        }
    }, [action, editData]);

    // ------------------ VALIDATION ------------------
    const validate = () => {
        let err = {
            violation_name: "",
            violation_nameAsterisk: false,
            offense_status: "",
            offense_statusAsterisk: false,
            penalties: "",
        };

        if (!data.violation_name.trim()) {
            err.violation_name = "Violation name is required.";
            err.violation_nameAsterisk = true;
        }

        if (data.offense_status !== "0" && data.offense_status !== "1") {
            err.offense_status = "Please select Major or Minor.";
            err.offense_statusAsterisk = true;
        }

        // 🔥 CORRECT PENALTY VALIDATION RULE
        let penaltyConflict = false;

        penalties.forEach(occ => {
            const totalRows = occ.list.length;
            const emptyRows = occ.list.filter(p => p.penalty_id.trim() === "").length;

            // ❌ If more than 1 slot AND all slots empty → invalid
            if (totalRows > 1 && emptyRows === totalRows) {
                penaltyConflict = true;
            }
        });

        if (penaltyConflict) {
            err.penalties = "Please select at least ONE penalty for occurrences with multiple slots.";
        }

        setValidationErr(err);
        return !(err.violation_name || err.offense_status || err.penalties);
    };

    // ------------------ INPUT HANDLERS ------------------
    const handleChange = (e) => {
        change(e, setData)
        validate()
    }

    const handlePenaltyChange = (occIndex, pIndex, value) => {
        const updated = [...penalties];
        updated[occIndex].list[pIndex].penalty_id = value;
        setPenalties(updated);
        validate();
    };

    const addPenalty = (occIndex) => {
        const updated = [...penalties];
        updated[occIndex].list.push({ penalty_id: "" });
        setPenalties(updated);
        validate();
    };

    const removePenalty = (occIndex, pIndex) => {
        const updated = [...penalties];
        updated[occIndex].list.splice(pIndex, 1);
        setPenalties(updated);
        validate();
    };

    // ------------------ SUBMIT ------------------
    const handleSubmit = (e) => {
        e.preventDefault()
        if (!validate()) return

        const loadingMsg = action === "add"
            ? "Creating New Violation. Please Wait"
            : "Updating Violation. Please Wait"

        const successMsg = action === "add"
            ? "New Violation Created Successfully"
            : "Violation Updated Successfully"

        const payload = { ...data, penalties }

        showWarningModal(
            action === 'add' ? 'Are You Sure You Want to Add This New Violation?' : 'Are You Sure You Want to Update This Violation?',
            action === 'add' ? 'Add New Violation' : 'Update Violation',
            'Cancel',
            () => {
                props.reload(true, "text-wait", loadingMsg)
                ViolationService.saveViolation(
                    action,
                    payload,
                    props.setter,
                    () => {
                        props.reload(true, '')
                        showOutputModal(
                            successMsg,
                            's',
                            () => {
                                props.reload(false)
                                props.closeModal(false)
                            }
                        )
                    },
                    (e) => {
                        props.setData(true)
                        props.reload(true, '')
                        showOutputModal(
                            "Failed. " + (e.response?.data?.message || ""),
                            's',
                            () => props.reload(false)
                        )
                    }
                )
            }
        )
    }

    // ------------------ UI ------------------
    return (
        <UpModal
            close={props.close}
            closeModal={props.closeModal}
            isEnableOuterClose={props.isEnableOuterClose}
            pd={props.pd}
            bgColor="bg-white"
            w="w-[40rem]"
            cntr={true}
        >
            <div className="w-full">
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-5">
                        <div className="text-[1.2em] text-center font-bold">
                            {action === "add" ? "Add New Violation" : "Edit Violation"}
                        </div>

                        <div className="grid gap-5">
                            <FormTextfield
                                label="Violation Name"
                                name="violation_name"
                                val={data.violation_name}
                                change={handleChange}
                                error={validationErr.violation_name}
                                errorAsterisk={validationErr.violation_nameAsterisk}
                            />

                            <RadioButton
                                label="Status"
                                name="offense_status"
                                list={[
                                    { val: "1", label: "Major" },
                                    { val: "0", label: "Minor" },
                                ]}
                                val={data.offense_status}
                                change={handleChange}
                                error={validationErr.offense_status}
                                errorAsterisk={validationErr.offense_statusAsterisk}
                            />

                            {/* PENALTIES SECTION */}
                            <div className="grid gap-4 mt-3">
                                <h2 className="font-bold text-[1.1em]">Penalties per Occurrence</h2>

                                {penalties.map((occ, occIndex) => (
                                    <div key={occ.occurrence} className="border rounded p-3">
                                        <h3 className="font-semibold mb-2">{ordinal(occ.occurrence)} Offense</h3>

                                        {occ.list.map((p, pIndex) => (
                                            <div key={pIndex} className="flex items-center gap-2 mb-2">
                                                <Select
                                                    size="small"
                                                    fullWidth
                                                    value={p.penalty_id}
                                                    onChange={(e) =>
                                                        handlePenaltyChange(occIndex, pIndex, e.target.value)
                                                    }
                                                    sx={{ '& .MuiOutlinedInput-root, &.MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.85em' } }}
                                                >
                                                    <MenuItem value="">(Optional) Select Penalty</MenuItem>
                                                    {props.penalty.map(opt => (
                                                        <MenuItem key={opt.id} value={opt.id}>
                                                            {opt.ref_number != null ? `${opt.ref_number} — ${toTitleCase(opt.description)}` : toTitleCase(opt.description)}
                                                        </MenuItem>
                                                    ))}
                                                </Select>

                                                {pIndex === 0 ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => addPenalty(occIndex)}
                                                        className="bg-green-500 text-white px-3 py-1 rounded"
                                                    >
                                                        +
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => removePenalty(occIndex, pIndex)}
                                                        className="bg-red-500 text-white px-3 py-1 rounded"
                                                    >
                                                        -
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ))}

                                {validationErr.penalties && (
                                    <p className="text-red-600 text-sm">{validationErr.penalties}</p>
                                )}
                            </div>

                            <FormButton
                                label={action === "add" ? "Submit" : "Update"}
                                type="submit"
                            />
                        </div>
                    </div>
                </form>
            </div>
        </UpModal>
    );
};

export default SetViolationModal
