import { useEffect, useState } from "react"
import axios from "axios"
import { Autocomplete, Box, Chip, CircularProgress, TextField, Typography } from "@mui/material"
import { readableDate } from "@/others/function"

/**
 * "Related violation(s)": which of the student(s)' violations an
 * intervention (appointment, office call, referral) addresses. Only linked
 * interventions count toward the Early Intervention Violation Predictor's
 * data for that violation. The options are the violations the student(s)
 * have a resolved record of, each with its record (how many times, when
 * last), most recent first.
 *
 * value: array of violation ids; onChange(ids).
 */
const RelatedViolationsField = ({ studentIds = [], value = [], onChange, disabled = false, helper }) => {
    const [options, setOptions] = useState([])
    const [loading, setLoading] = useState(false)
    const key = studentIds.filter(Boolean).join(",")

    useEffect(() => {
        if (!key) { setOptions([]); return }
        let live = true
        setLoading(true)
        axios.get("/prefect/intervention/violation-options", { params: { students: key.split(",") } })
            .then((res) => {
                if (!live) return
                const list = res.data?.data ?? []
                setOptions(list)
                // Drop a chosen violation the student(s) no longer have.
                const ids = new Set(list.map((o) => o.id))
                if (value.some((v) => !ids.has(v))) onChange?.(value.filter((v) => ids.has(v)))
            })
            .catch(() => live && setOptions([]))
            .finally(() => live && setLoading(false))
        return () => { live = false }
    }, [key])

    const selected = options.filter((o) => value.includes(o.id))

    return (
        // min-w-0 / minWidth 0: a long chip must not widen the form around it.
        <div className="grid gap-1 min-w-0 w-full">
            <Autocomplete
                fullWidth
                multiple
                size="small"
                options={options}
                value={selected}
                loading={loading}
                disabled={disabled || !key}
                getOptionLabel={(o) => o.name}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                onChange={(_, list) => onChange?.(list.map((o) => o.id))}
                noOptionsText={key ? "This student has no resolved violations on record" : "Choose a student first"}
                renderOption={(props, o, { selected: isOn }) => {
                    const { key: k, ...rest } = props
                    return (
                        <Box component="li" key={k} {...rest} sx={{ display: "block !important", py: "6px !important" }}>
                            <Typography sx={{ fontSize: "0.85rem", fontWeight: isOn ? 600 : 500 }}>{o.name}</Typography>
                            {o.times != null && (
                                <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
                                    {o.times === 1 ? "Once" : `${o.times} times`}{o.last_at ? ` · last ${readableDate(o.last_at)}` : ""}
                                </Typography>
                            )}
                        </Box>
                    )
                }}
                renderTags={(list, getTagProps) => list.map((o, i) => {
                    const { key: k, ...rest } = getTagProps({ index: i })
                    return (
                        <Chip
                            key={k}
                            size="small"
                            label={o.name}
                            title={o.name}
                            {...rest}
                            sx={{
                                maxWidth: "100%", minWidth: 0, fontWeight: 500,
                                bgcolor: "var(--tone-blue-bg)", color: "var(--tone-blue-fg)",
                                "& .MuiChip-deleteIcon": { color: "var(--tone-blue-fg)", opacity: 0.7, "&:hover": { opacity: 1, color: "var(--tone-blue-fg)" } },
                            }}
                        />
                    )
                })}
                sx={{
                    // Chips wrap; the typing box shrinks to nothing once there
                    // are chips, so it sits after the last one instead of
                    // dropping to an empty line of its own.
                    minWidth: 0,
                    "& .MuiAutocomplete-inputRoot": { flexWrap: "wrap", gap: 0.5, py: "6px !important", minWidth: 0 },
                    "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" },
                    "& .MuiAutocomplete-inputRoot .MuiAutocomplete-input": selected.length
                        ? { minWidth: "0 !important", width: "0 !important", flexGrow: 1, p: "4px 0 !important" }
                        : {},
                    "& .MuiAutocomplete-tag": { m: 0 },
                }}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Related violation(s)"
                        placeholder={selected.length ? "" : "Optional"}
                        slotProps={{
                            input: {
                                ...params.InputProps,
                                endAdornment: <>{loading && <CircularProgress size={14} />}{params.InputProps.endAdornment}</>,
                            },
                        }}
                        sx={{ "& input": { boxShadow: "none !important", outline: "none !important" } }}
                    />
                )}
            />
            {/* helper={false}: no help line (the form explains it once). */}
            {helper !== false && (
                <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", lineHeight: 1.5 }}>
                    {helper ?? "Choose the violation(s) this is about. Leave it blank if it is not about one of the student's violations. It is then recorded as help given to the student for those violations."}
                </Typography>
            )}
        </div>
    )
}

// Read-only: the violation(s) an intervention addresses, as chips (nothing
// when there are none).
export const RelatedViolationsList = ({ list = [], note }) => {
    if (!list?.length) return null
    return (
        <div className="grid gap-1.5">
            <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: "text.secondary" }}>Related violation(s)</Typography>
            <div className="flex flex-wrap gap-1.5">
                {list.map((v) => (
                    <Chip key={v.id} size="small" label={v.name}
                        sx={{ fontWeight: 500, bgcolor: "var(--tone-blue-bg)", color: "var(--tone-blue-fg)", border: 1, borderColor: "var(--tone-blue-bd)" }} />
                ))}
            </div>
            {note && <Typography sx={{ fontSize: "0.7rem", color: "text.secondary" }}>{note}</Typography>}
        </div>
    )
}

export default RelatedViolationsField
