import { useEffect, useState } from "react"
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Paper, Skeleton, Typography } from "@mui/material"
import { Activity, ChevronDown, Flag, History, Lightbulb, ListChecks, Target, TrendingUp, Info } from "lucide-react"

// The Behavioural Analysis page's two cards under the verdict: the model's
// contributing factors and the recommendations (MUI).

// `tone`: the verdict's colour (red: likely to commit again, green: unlikely).
export const toneOf = (likely) => likely
    ? { main: "#dc2626", soft: "#fee2e2", text: "#b91c1c" }
    : { main: "#16a34a", soft: "#dcfce7", text: "#15803d" }

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

// An insight reads "Label: explanation"; the label picks its icon.
const FACTOR_ICONS = [
    [/offense|history/i, History],
    [/recent|activity/i, Activity],
    [/pattern|trend/i, TrendingUp],
    [/reason|main/i, Target],
    [/result|verdict/i, Flag],
]

const splitFactor = (text) => {
    const m = String(text).match(/^([^:]{2,40}):\s*(.+)$/s)
    const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1)
    return m ? { label: m[1].trim(), body: cap(m[2].trim()) } : { label: null, body: String(text) }
}

const iconFor = (label) => FACTOR_ICONS.find(([re]) => re.test(label ?? ""))?.[1] ?? Info

export const ContributingFactors = ({ insights = [], tone }) => (
    <Paper variant="outlined" sx={CARD}>
        <CardHeader icon={ListChecks} title="Contributing Factors" tone={tone} />
        <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1 }}>
            {insights.map((f, i) => {
                const { label, body } = splitFactor(f)
                const Icon = iconFor(label)
                const isResult = /^(result|verdict)$/i.test(label ?? "")
                return (
                    <Box
                        key={i}
                        sx={{
                            display: "flex", gap: 1.5, py: 1.5,
                            borderTop: i ? 1 : 0, borderColor: "divider",
                            ...(isResult && { mx: -1, px: 1, borderRadius: 2, bgcolor: tone.soft, borderTop: 0, mt: 1 }),
                        }}
                    >
                        <Box sx={{ width: 30, height: 30, flexShrink: 0, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: isResult ? "#fff" : "action.hover", color: isResult ? tone.main : "text.secondary" }}>
                            <Icon size={15} />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            {label && (
                                <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: isResult ? tone.text : "text.secondary" }}>
                                    {label}
                                </Typography>
                            )}
                            <Typography sx={{ fontSize: "0.875rem", lineHeight: 1.6, color: "text.primary" }}>{body}</Typography>
                        </Box>
                    </Box>
                )
            })}
        </Box>
    </Paper>
)

/* ---------------- Recommendations ---------------- */

// "What to do. How. Who. Why." -> the first sentence as the title, the rest as details.
const splitReco = (text) => {
    const s = String(text).trim()
    const m = s.match(/^(.+?[.!?])\s+(.+)$/s)
    return m ? { title: m[1], body: m[2] } : { title: s, body: "" }
}

export const Recommendations = ({ list, failed, tone }) => {
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
                right={items.length > 0 && (
                    <Button size="small" onClick={() => { setAll(!all); setOpen(-1) }} sx={{ textTransform: "none", fontWeight: 500, fontSize: "0.8rem", minWidth: 0, px: 1, flexShrink: 0 }}>
                        {all ? "Collapse all" : "Expand all"}
                    </Button>
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
                                <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, lineHeight: 1.5 }}>{r.title}</Typography>
                            </AccordionSummary>
                            {r.body && (
                                <AccordionDetails sx={{ pt: 0, pb: 1.75, pl: 5.25, pr: 2 }}>
                                    <Typography sx={{ fontSize: "0.85rem", lineHeight: 1.65, color: "text.secondary" }}>{r.body}</Typography>
                                </AccordionDetails>
                            )}
                        </Accordion>
                    ))
                )}
            </Box>
        </Paper>
    )
}

