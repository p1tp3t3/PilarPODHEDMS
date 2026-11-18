import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Chip, Paper, Skeleton, Stack, Typography } from "@mui/material"
import { ChevronDown, Lightbulb, ListChecks, RefreshCw, Clock, FolderOpen } from "lucide-react"
import { readableDate, readableTime, ordinal, toTitleCase } from "@/others/function"

// The Behavioural Analysis page's two cards under the verdict: the model's
// contributing factors and the recommendations (MUI).

// `tone`: the verdict's colour (red: likely to commit again, green: unlikely).
export const toneOf = (likely) => likely
    ? { main: "#dc2626", soft: "var(--tone-red-bg)", text: "var(--tone-red-fg)" }
    : { main: "#16a34a", soft: "var(--tone-green-bg)", text: "var(--tone-green-fg)" }

// A minimal header: a small icon in the verdict's colour and the title.
const CardHeader = ({ icon: Icon, title, tone, right }) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: { xs: 2, sm: 2.5 }, minHeight: 48, borderBottom: 1, borderColor: "divider" }}>
        <Box component="span" sx={{ display: "flex", color: tone.main, flexShrink: 0 }}><Icon size={16} /></Box>
        <Typography component="h3" sx={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: "0.9rem" }}>{title}</Typography>
        {right}
    </Box>
)

const CARD = { borderRadius: 3, overflow: "hidden", minWidth: 0 }

/* ---------------- Contributing factors ---------------- */

// An insight reads "Label: explanation" -> a small label over justified text.
const splitFactor = (text) => {
    const m = String(text).match(/^([^:]{2,40}):\s*(.+)$/s)
    const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1)
    return m ? { label: m[1].trim(), body: cap(m[2].trim()) } : { label: null, body: String(text) }
}

export const ContributingFactors = ({ insights = [], tone }) => (
    <Paper variant="outlined" sx={CARD}>
        <CardHeader icon={ListChecks} title="Contributing Factors" tone={tone} />
        <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1 }}>
            {insights.map((f, i) => {
                const { label, body } = splitFactor(f)
                // The closing "Result" stands out in the verdict's tint.
                const isResult = /^(result|verdict)$/i.test(label ?? "")
                return (
                    <Box
                        key={i}
                        sx={{
                            py: 1.5,
                            borderTop: i ? 1 : 0, borderColor: "divider",
                            ...(isResult && { mx: -1, px: 1.5, borderRadius: 2, bgcolor: tone.soft, borderTop: 0, mt: 1 }),
                        }}
                    >
                        {label && (
                            <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: isResult ? tone.text : "text.secondary", mb: 0.25 }}>
                                {label}
                            </Typography>
                        )}
                        <Typography sx={{ fontSize: "0.875rem", lineHeight: 1.65, color: "text.primary", textAlign: "justify", hyphens: "auto" }}>{body}</Typography>
                    </Box>
                )
            })}
        </Box>
    </Paper>
)

/* ---------------- Recommendations ---------------- */

// Title case for a recommendation's title: every word capitalised except
// short joining words in the middle; words with capitals inside (PE, HR)
// are kept. Same rule as the report PDF (ViolationController::titleCase).
const SMALL_WORDS = new Set(["a", "an", "the", "and", "but", "or", "nor", "for", "so", "yet", "as", "at", "by", "in", "of", "on", "per", "to", "via"])
const titleCase = (text) => {
    const words = text.split(" ")
    return words.map((word, i) => word.split("-").map((part, j) => {
        const at = part.search(/[A-Za-z]/)
        if (at === -1) return part
        const core = part.slice(at)
        if (/[A-Z]/.test(core.slice(1))) return part
        const inner = !(i === 0 && j === 0) && i !== words.length - 1
        if (inner && SMALL_WORDS.has(core.replace(/[^A-Za-z]/g, "").toLowerCase())) return part.toLowerCase()
        return part.slice(0, at) + core.charAt(0).toUpperCase() + core.slice(1)
    }).join("-")).join(" ")
}

// "What to do. How. Who. Why." -> the first sentence as the title, the rest as details.
const splitReco = (text) => {
    const s = String(text).trim()
    const m = s.match(/^(.+?[.!?])\s+(.+)$/s)
    return m ? { title: titleCase(m[1]), body: m[2] } : { title: titleCase(s), body: "" }
}

// `onRefresh`: shows a "New set" button (prefect only) that asks for different ones.
export const Recommendations = ({ list, failed, tone, onRefresh = null, refreshing = false }) => {
    const [open, setOpen] = useState(0)
    const [all, setAll] = useState(false)
    const items = Array.isArray(list) ? list.map(splitReco) : []

    // A new set (another violation picked): first one open again.
    useEffect(() => { setOpen(0); setAll(false) }, [list])

    const isOpen = (i) => all || open === i
    const toggle = (i) => {
        if (all) { setAll(false); setOpen(i === open ? -1 : i); return }
        setOpen(open === i ? -1 : i)
    }

    return (
        <Paper variant="outlined" sx={CARD}>
            <CardHeader
                icon={Lightbulb}
                title="Recommendations"
                tone={tone}
                right={(items.length > 0 || onRefresh) && (
                    <Stack direction="row" sx={{ alignItems: "center", gap: 0.5, flexShrink: 0 }}>
                        {items.length > 0 && (
                            <Button size="small" onClick={() => { setAll(!all); setOpen(-1) }} sx={{ textTransform: "none", fontWeight: 500, fontSize: "0.8rem", minWidth: 0, px: 1 }}>
                                {all ? "Collapse all" : "Expand all"}
                            </Button>
                        )}
                        {onRefresh && (
                            <Button
                                size="small"
                                onClick={onRefresh}
                                disabled={refreshing || list == null}
                                startIcon={<RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />}
                                title="Write a different set of recommendations"
                                sx={{ textTransform: "none", fontWeight: 500, fontSize: "0.8rem", minWidth: 0, px: 1 }}
                            >
                                New set
                            </Button>
                        )}
                    </Stack>
                )}
            />
            <Box sx={{ p: { xs: 1, sm: 1.5 } }}>
                {list == null ? (
                    // Still being written: placeholder rows.
                    <Box sx={{ display: "grid", gap: 1.5, p: 1 }} aria-label="Loading recommendations">
                        <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>Writing recommendations…</Typography>
                        {[92, 78, 85, 70].map((w, i) => (
                            <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                <Skeleton variant="circular" width={26} height={26} sx={{ flexShrink: 0 }} />
                                <Skeleton height={20} sx={{ width: `${w}%` }} />
                            </Box>
                        ))}
                    </Box>
                ) : failed || items.length === 0 ? (
                    <Typography sx={{ p: 1.5, fontSize: "0.875rem", color: "text.secondary", fontStyle: "italic" }}>
                        {failed ? "Recommendations couldn't be loaded. Please try again later." : "No recommendations."}
                    </Typography>
                ) : (
                    items.map((r, i) => (
                        <Accordion
                            key={i}
                            disableGutters
                            elevation={0}
                            expanded={isOpen(i)}
                            onChange={() => r.body && toggle(i)}
                            sx={{
                                bgcolor: "transparent",
                                "&::before": { display: "none" },
                                borderBottom: i < items.length - 1 ? 1 : 0,
                                borderColor: "divider",
                            }}
                        >
                            <AccordionSummary
                                expandIcon={r.body ? <ChevronDown size={18} /> : null}
                                sx={{ px: 1, minHeight: 0, "& .MuiAccordionSummary-content": { my: 1.25, alignItems: "flex-start", gap: 1.5 } }}
                            >
                                <Typography component="span" sx={{ width: 22, flexShrink: 0, fontSize: "0.875rem", lineHeight: 1.5, fontWeight: 500, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                                    {i + 1}.
                                </Typography>
                                <Typography sx={{ flex: 1, minWidth: 0, fontSize: "0.875rem", fontWeight: 600, lineHeight: 1.5, textAlign: "justify" }}>{r.title}</Typography>
                            </AccordionSummary>
                            {r.body && (
                                <AccordionDetails sx={{ pt: 0, pb: 1.75, pl: 5.25, pr: 2 }}>
                                    <Typography sx={{ fontSize: "0.85rem", lineHeight: 1.65, color: "text.secondary", textAlign: "justify" }}>{r.body}</Typography>
                                </AccordionDetails>
                            )}
                        </Accordion>
                    ))
                )}
            </Box>
        </Paper>
    )
}

/* ---------------- Violation timeline ---------------- */

// Long text cut to `lines` lines with "See more" / "See less"; the link only
// shows when the text actually runs past them (re-checked on resize).
const ClampText = ({ text, lines = 3 }) => {
    const ref = useRef(null)
    const [open, setOpen] = useState(false)
    const [overflows, setOverflows] = useState(false)

    useLayoutEffect(() => {
        const el = ref.current
        if (!el) return
        const check = () => { if (!open) setOverflows(el.scrollHeight > el.clientHeight + 1) }
        check()
        const ro = new ResizeObserver(check)
        ro.observe(el)
        return () => ro.disconnect()
    }, [text, open])

    return (
        <Box sx={{ mt: 0.75 }}>
            <Typography
                ref={ref}
                sx={{
                    fontSize: "0.875rem", lineHeight: 1.6, color: "text.primary", wordBreak: "break-word",
                    ...(!open && { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" }),
                }}
            >
                {text}
            </Typography>
            {(overflows || open) && (
                <Button
                    size="small"
                    onClick={() => setOpen(!open)}
                    aria-expanded={open}
                    sx={{ mt: 0.25, ml: -0.75, px: 0.75, minWidth: 0, textTransform: "none", fontWeight: 600, fontSize: "0.8rem" }}
                >
                    {open ? "See less" : "See more"}
                </Button>
            )}
        </Box>
    )
}

// Every time the student was found to have committed this violation, newest
// first: a dot on a line, the date beside it, the case number, which offense
// it was, the incident summary and the penalty. `dateOf(record)`: when it happened.
export const ViolationTimeline = ({ records = [], dateOf }) => (
    <Paper variant="outlined" sx={CARD}>
        <CardHeader
            icon={Clock}
            title="Violation Timeline"
            tone={{ main: "var(--tone-blue-fg)" }}
            right={<Chip size="small" label={`${records.length} record${records.length === 1 ? "" : "s"}`} sx={{ height: 22, fontSize: "0.72rem", fontWeight: 600 }} />}
        />
        {records.length === 0 ? (
            <Stack sx={{ alignItems: "center", py: 6, color: "text.secondary", gap: 1 }}>
                <FolderOpen size={32} style={{ opacity: 0.6 }} />
                <Typography sx={{ fontSize: "0.875rem" }}>No violation history found.</Typography>
            </Stack>
        ) : (
            <Box component="ol" sx={{ listStyle: "none", m: 0, px: { xs: 2, sm: 2.5 }, py: 2 }}>
                {records.map((v, i) => {
                    const at = dateOf(v)
                    const last = i === records.length - 1
                    const summary = v.complaint?.incident_summary || v.complaint?.complaintSubject?.[0]?.incident_summary
                    return (
                        <Box component="li" key={v.id ?? i} sx={{ display: "grid", gridTemplateColumns: { xs: "20px 1fr", sm: "130px 20px 1fr" }, columnGap: 1.5 }}>
                            {/* date (beside the line on wider screens) */}
                            <Box sx={{ display: { xs: "none", sm: "block" }, textAlign: "right", pt: 0.25 }}>
                                <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: "text.primary" }}>{at ? readableDate(at) : "—"}</Typography>
                                {at && <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>{readableTime(at)}</Typography>}
                            </Box>
                            {/* dot + line */}
                            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", pt: 0.6 }}>
                                <Box sx={{ width: 12, height: 12, borderRadius: "50%", flexShrink: 0, bgcolor: i === 0 ? "var(--tone-red-fg)" : "text.disabled", boxShadow: i === 0 ? "0 0 0 4px var(--tone-red-bg)" : "none" }} />
                                {!last && <Box sx={{ flex: 1, width: 2, bgcolor: "divider", mt: 0.75 }} />}
                            </Box>
                            <Box sx={{ minWidth: 0, pb: last ? 0 : 2.5 }}>
                                <Box sx={{ display: { xs: "block", sm: "none" }, mb: 0.5 }}>
                                    <Typography component="span" sx={{ fontSize: "0.8rem", fontWeight: 600 }}>{at ? readableDate(at) : "—"}</Typography>
                                    {at && <Typography component="span" sx={{ fontSize: "0.72rem", color: "text.secondary" }}> · {readableTime(at)}</Typography>}
                                </Box>
                                <Stack direction="row" sx={{ alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                    <Chip size="small" variant="outlined" label={`Case No. ${v.complaint?.case_number ?? "—"}`} sx={{ height: 22, fontSize: "0.72rem", fontWeight: 600 }} />
                                    {v.occurrence && <Chip size="small" label={`${ordinal(v.occurrence)} offense`} sx={{ height: 22, fontSize: "0.72rem", fontWeight: 600 }} />}
                                    {i === 0 && <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--tone-red-fg)" }}>Latest</Typography>}
                                </Stack>
                                {summary
                                    ? <ClampText text={summary} />
                                    : <Typography sx={{ mt: 0.75, fontSize: "0.875rem", color: "text.secondary", fontStyle: "italic" }}>No incident summary.</Typography>}
                                {/* The penalty for this offense (the handbook's tier for its number). */}
                                <Typography sx={{ mt: 0.75, fontSize: "0.82rem", color: "text.secondary" }}>
                                    <Box component="span" sx={{ fontWeight: 600 }}>Penalty: </Box>
                                    {v.penalty
                                        ? <Box component="span" sx={{ color: "text.primary" }}>{v.penalty.ref_number != null ? `${v.penalty.ref_number} — ` : ""}{toTitleCase(v.penalty.description ?? "")}</Box>
                                        : <Box component="span" sx={{ fontStyle: "italic" }}>No penalty set</Box>}
                                </Typography>
                            </Box>
                        </Box>
                    )
                })}
            </Box>
        )}
    </Paper>
)

