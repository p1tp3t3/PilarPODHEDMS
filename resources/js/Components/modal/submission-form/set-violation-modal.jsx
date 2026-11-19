import UpModal from "../up-modal"
import FormTextfield from "@/Components/input/form-input"
import { change, showOutputModal, showWarningModal, toTitleCase, ordinal } from "@/others/function"
import { useState, useEffect } from "react"
import FormButton from "@/Components/button/button"
import { ViolationService } from "@/others/services/violation-service"
import RadioButton from "@/Components/input/radio"
import { Select, MenuItem, Autocomplete, TextField, Chip, Box, Button, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material"
import { Minus, Plus } from "lucide-react"
import { Validator } from "@/others/classes/validator"

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
    // Every time the form opens: Edit fills it from the chosen violation,
    // Add starts blank — so a cancelled edit never leaks into the next "Add".
    useEffect(() => {
        if (!props.close) return
        const d = action === "edit" ? (props.data || {}) : {}
        setData({
            id: d.id || "",
            violation_name: d.violation_name || "",
            offense_status: d.offense_status != null ? String(d.offense_status) : "1",
            keywords: Array.isArray(d.keywords) ? d.keywords : [],
        });
        setKeywordInput("");
        setPenalties([1, 2, 3, 4, 5, 6].map((occ) => {
            const matching = (d.penalties || []).filter((p) => Number(p.occurrence) === occ);
            return {
                occurrence: occ,
                list: matching.length > 0
                    ? matching.map((p) => ({ penalty_id: String(p.penalty_id) }))
                    : [{ penalty_id: "" }],
            };
        }));
        setValidationErr({
            violation_name: "", violation_nameAsterisk: false,
            offense_status: "", offense_statusAsterisk: false,
            keywords: "", keywordsAsterisk: false,
            penalties: "",
        });
    }, [props.close, action, props.data]);

    // ------------------ VALIDATION ------------------
    const validate = () => {
        const err = Validator.violation(data, penalties);
        setValidationErr(err);
        return !Validator.hasErrors(err);
    };

    // ------------------ INPUT HANDLERS ------------------
    const handleChange = (e) => {
        change(e, setData)
        validate()
    }

    // ------------------ KEYWORDS (list input) ------------------
    const validateKeywords = (list) => {
        setValidationErr(prev => ({ ...prev, ...Validator.keywords(list) }))
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
                            'e',
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
            <Box sx={{ width: "100%" }}>
                <Box component="form" onSubmit={handleSubmit} sx={{ display: "grid", gap: 2.5 }}>
                    <Typography component="h1" sx={{ fontSize: "1.2rem", fontWeight: 700, textAlign: "center" }}>
                        {action === "add" ? "Add New Violation" : "Edit Violation"}
                    </Typography>

                    <FormTextfield
                        label="Violation Name"
                        name="violation_name"
                        val={data.violation_name}
                        change={handleChange}
                        error={validationErr.violation_name}
                        errorAsterisk={validationErr.violation_nameAsterisk}
                    />

                    <Box sx={{ display: "grid", gap: 1 }}>
                        <Typography component="label" sx={{ fontSize: "0.875rem", fontWeight: 500, color: "text.secondary" }}>
                            Keywords {validationErr.keywordsAsterisk && <Box component="span" sx={{ color: "error.main" }}>*</Box>}
                        </Typography>

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
                                    sx={{ "& input": { boxShadow: "none !important", outline: "none !important" } }}
                                />
                            )}
                            noOptionsText="No other saved keywords — add a new one below"
                        />

                        {/* ...or add a brand-new one (optional). */}
                        <Stack direction="row" sx={{ gap: 1, alignItems: "center" }}>
                            <TextField
                                size="small"
                                fullWidth
                                value={keywordInput}
                                onChange={(e) => setKeywordInput(e.target.value)}
                                onKeyDown={handleKeywordKeyDown}
                                placeholder="New keyword (optional) — press Enter to add"
                                sx={{ "& input": { fontSize: "0.875rem", boxShadow: "none !important", outline: "none !important" } }}
                            />
                            <Button
                                type="button"
                                variant="contained"
                                disableElevation
                                onClick={addKeyword}
                                disabled={!keywordInput.trim()}
                                startIcon={<Plus size={16} />}
                                sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, flexShrink: 0, bgcolor: "#1d4ed8", "&:hover": { bgcolor: "#1e40af" } }}
                            >
                                Add
                            </Button>
                        </Stack>

                        {validationErr.keywords && (
                            <Typography sx={{ color: "error.main", fontSize: "0.82rem" }}>{validationErr.keywords}</Typography>
                        )}
                    </Box>

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
                    <Box sx={{ display: "grid", gap: 1.5, mt: 0.5 }}>
                        <Typography component="h2" sx={{ fontWeight: 700, fontSize: "1rem" }}>Penalties per Occurrence</Typography>

                        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
                        {penalties.map((occ, occIndex) => (
                            <Paper key={occ.occurrence} variant="outlined" sx={{ p: 1.5, borderRadius: 2, minWidth: 0 }}>
                                <Typography component="h3" sx={{ fontWeight: 600, fontSize: "0.875rem", mb: 1 }}>{ordinal(occ.occurrence)} Offense</Typography>

                                {/* Penalties added to this offense scroll inside the box
                                    (about 3 rows tall) instead of growing it. */}
                                <Box sx={{ maxHeight: "8.5rem", overflowY: "auto", overflowX: "hidden", pr: 0.5, pt: 0.5 }}>
                                {occ.list.map((p, pIndex) => (
                                    <Stack key={pIndex} direction="row" sx={{ alignItems: "center", gap: 1, mb: 1 }}>
                                        <Select
                                            size="small"
                                            fullWidth
                                            value={p.penalty_id}
                                            displayEmpty
                                            renderValue={(v) => {
                                                if (!v) return <Box component="span" sx={{ color: "text.disabled" }}>(Optional) Select Penalty</Box>
                                                const opt = props.penalty.find((o) => String(o.id) === String(v))
                                                return opt ? (opt.ref_number != null ? `${opt.ref_number} — ${toTitleCase(opt.description)}` : toTitleCase(opt.description)) : v
                                            }}
                                            onChange={(e) =>
                                                handlePenaltyChange(occIndex, pIndex, e.target.value)
                                            }
                                            sx={{ minWidth: 0, '& .MuiOutlinedInput-root, &.MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.85em' } }}
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
                                            <Tooltip title="Add another penalty for this offense">
                                                <IconButton
                                                    type="button"
                                                    size="small"
                                                    onClick={() => addPenalty(occIndex)}
                                                    aria-label="Add another penalty"
                                                    sx={{ flexShrink: 0, bgcolor: "var(--tone-green-bg)", color: "var(--tone-green-fg)", border: 1, borderColor: "var(--tone-green-bd)", borderRadius: 1.5, "&:hover": { bgcolor: "var(--tone-green-bg)", filter: "brightness(0.95)" } }}
                                                >
                                                    <Plus size={16} />
                                                </IconButton>
                                            </Tooltip>
                                        ) : (
                                            <Tooltip title="Remove this penalty">
                                                <IconButton
                                                    type="button"
                                                    size="small"
                                                    onClick={() => removePenalty(occIndex, pIndex)}
                                                    aria-label="Remove this penalty"
                                                    sx={{ flexShrink: 0, bgcolor: "var(--tone-red-bg)", color: "var(--tone-red-fg)", border: 1, borderColor: "var(--tone-red-bd)", borderRadius: 1.5, "&:hover": { bgcolor: "var(--tone-red-bg)", filter: "brightness(0.95)" } }}
                                                >
                                                    <Minus size={16} />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Stack>
                                ))}
                                </Box>
                            </Paper>
                        ))}
                        </Box>

                        {validationErr.penalties && (
                            <Typography sx={{ color: "error.main", fontSize: "0.82rem" }}>{validationErr.penalties}</Typography>
                        )}
                    </Box>

                    <FormButton
                        label={action === "add" ? "Submit" : "Update"}
                        type="submit"
                    />
                </Box>
            </Box>
        </UpModal>
    );
};

export default SetViolationModal
