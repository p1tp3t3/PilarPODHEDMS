import UpModal from "../up-modal"
import FormTextfield from "@/Components/input/form-input"
import { change, showOutputModal, showWarningModal, toTitleCase, ordinal } from "@/others/function"
import { useState, useEffect } from "react"
import FormButton from "@/Components/button/button"
import { ViolationService } from "@/others/services/violation-service"
import RadioButton from "@/Components/input/radio"
import { Select, MenuItem, Autocomplete, TextField, Chip } from "@mui/material"

const SetViolationModal = (props) => {
    const action = props.action || "add"
    const editData = props.data || {}

    const [data, setData] = useState({
        id: "",
        violation_name: "",
        offense_status: "1",
        keywords: [],
    })

    const [keywordInput, setKeywordInput] = useState("")

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
        keywords: "",
        keywordsAsterisk: false,
        penalties: "",
    })

    // ------------------ LOAD EDIT DATA ------------------
    useEffect(() => {
        if (action === "edit" && editData) {
            setData({
                id: editData.id || "",
                violation_name: editData.violation_name || "",
                offense_status: editData.offense_status != null ? String(editData.offense_status) : "1",
                keywords: Array.isArray(editData.keywords) ? editData.keywords : [],
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
            keywords: "",
            keywordsAsterisk: false,
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

        if (!data.keywords || data.keywords.length === 0) {
            err.keywords = "Please add at least one keyword.";
            err.keywordsAsterisk = true;
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
        return !(err.violation_name || err.offense_status || err.keywords || err.penalties);
    };

    // ------------------ INPUT HANDLERS ------------------
    const handleChange = (e) => {
        change(e, setData)
        validate()
    }

    // ------------------ KEYWORDS (list input) ------------------
    const validateKeywords = (list) => {
        setValidationErr(prev => ({
            ...prev,
            keywords: list.length === 0 ? "Please add at least one keyword." : "",
            keywordsAsterisk: list.length === 0,
        }))
    }

    const addKeyword = () => {
        const trimmed = keywordInput.trim()
        if (!trimmed) return
        if (data.keywords.some(k => k.toLowerCase() === trimmed.toLowerCase())) {
            setKeywordInput("")
            return
        }
        const updated = [...data.keywords, trimmed]
        setData(prev => ({ ...prev, keywords: updated }))
        setKeywordInput("")
        validateKeywords(updated)
    }

    // Every keyword already used on any violation, for the picker.
    const keywordOptions = [...new Set((props.keywordOptions ?? []).map((k) => String(k).trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b))

    const setKeywordList = (list) => {
        const unique = list.filter((k, i) => list.findIndex((x) => x.toLowerCase() === k.toLowerCase()) === i)
        setData(prev => ({ ...prev, keywords: unique }))
        validateKeywords(unique)
    }

    const handleKeywordKeyDown = (e) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault()
            addKeyword()
        }
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
            w="w-[48rem]"
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

                            <div className="grid gap-2">
                                <label className="text-[0.9em] font-medium text-gray-700">
                                    Keywords {validationErr.keywordsAsterisk && <span className="text-red-600">*</span>}
                                </label>

                                {/* Pick from keywords already used on other violations... */}
                                <Autocomplete
                                    multiple
                                    size="small"
                                    options={keywordOptions}
                                    value={data.keywords}
                                    onChange={(e, value) => setKeywordList(value)}
                                    filterSelectedOptions
                                    disableCloseOnSelect
                                    renderTags={(value, getTagProps) =>
                                        value.map((kw, i) => {
                                            const { key, ...tagProps } = getTagProps({ index: i })
                                            return <Chip key={key} label={kw} size="small" {...tagProps} />
                                        })
                                    }
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            placeholder={data.keywords.length ? "" : "Select keywords"}
                                            error={!!validationErr.keywords}
                                        />
                                    )}
                                    noOptionsText="No other saved keywords — add a new one below"
                                />

                                {/* ...or add a brand-new one (optional). */}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={keywordInput}
                                        onChange={(e) => setKeywordInput(e.target.value)}
                                        onKeyDown={handleKeywordKeyDown}
                                        placeholder="New keyword (optional) — press Enter to add"
                                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-[0.9em] focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                    <button
                                        type="button"
                                        onClick={addKeyword}
                                        disabled={!keywordInput.trim()}
                                        className="bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 text-[0.9em] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Add
                                    </button>
                                </div>

                                {validationErr.keywords && (
                                    <p className="text-red-600 text-sm">{validationErr.keywords}</p>
                                )}
                            </div>

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
                            <div className="grid gap-3 mt-1">
                                <h2 className="font-bold text-[1.05em]">Penalties per Occurrence</h2>

                                <div className="grid gap-3 md:grid-cols-2">
                                {penalties.map((occ, occIndex) => (
                                    <div key={occ.occurrence} className="border border-gray-200 rounded-md p-3">
                                        <h3 className="font-semibold text-[0.9em] mb-2">{ordinal(occ.occurrence)} Offense</h3>

                                        {/* Penalties added to this offense scroll inside the box
                                            (about 3 rows tall) instead of growing it. */}
                                        <div className="max-h-[8.5rem] overflow-y-auto overflow-x-hidden pr-1 pt-1">
                                        {occ.list.map((p, pIndex) => (
                                            <div key={pIndex} className="flex items-center gap-2 mb-2">
                                                <Select
                                                    size="small"
                                                    fullWidth
                                                    value={p.penalty_id}
                                                    displayEmpty
                                                    renderValue={(v) => {
                                                        if (!v) return <span className="text-gray-400">(Optional) Select Penalty</span>
                                                        const opt = props.penalty.find((o) => String(o.id) === String(v))
                                                        return opt ? (opt.ref_number != null ? `${opt.ref_number} — ${toTitleCase(opt.description)}` : toTitleCase(opt.description)) : v
                                                    }}
                                                    onChange={(e) =>
                                                        handlePenaltyChange(occIndex, pIndex, e.target.value)
                                                    }
                                                    sx={{ '& .MuiOutlinedInput-root, &.MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.85em' } }}
                                                >
                                                    <MenuItem value="">(Optional) Select Penalty</MenuItem>
                                                    {/* String ids, matching the saved penalties loaded for editing —
                                                        MUI's Select compares strictly, so 2 !== "2" showed blank. */}
                                                    {props.penalty.map(opt => (
                                                        <MenuItem key={opt.id} value={String(opt.id)}>
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
                                    </div>
                                ))}
                                </div>

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
