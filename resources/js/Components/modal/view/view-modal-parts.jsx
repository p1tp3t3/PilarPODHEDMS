import { getProfilePic, toTitleCase, profileUrl, openPdfTab, showOutputModal, showUserType, readableDate, readableTime, formatSchoolYearSemester } from "../../../others/function"
import { Avatar, Box, Button, ButtonBase, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Paper, Skeleton, Stack, Tooltip, Typography } from "@mui/material"
import { useState } from "react"
import PictureAsPdfOutlined from "@mui/icons-material/PictureAsPdfOutlined"
import { ChevronRight } from "lucide-react"
import { Link, usePage } from "@inertiajs/react"

// Shared building blocks for the "view [record]" modals (complaint, referral,
// absent form, gate pass, ...) — one consistent card/timeline/status-badge
// language (MUI) instead of every modal hand-rolling its own layout.

// Colour sets: background, text, border. CSS variables (resources/css/app.css)
// with a light and a dark value, so they follow dark mode.
const tone = (name) => ({ bg: `var(--tone-${name}-bg)`, fg: `var(--tone-${name}-fg)`, bd: `var(--tone-${name}-bd)` })
export const TONES = Object.fromEntries(["gray", "yellow", "amber", "orange", "green", "red", "blue"].map((n) => [n, tone(n)]))

// A record's status -> its colour set.
const STATUS_TONE = {
    pending: "yellow", ongoing: "orange", approved: "green", resolved: "green",
    rejected: "red", revoked: "gray", expired: "gray",
}

// "red", or the older Tailwind form "border-red-200" -> the colour set.
const toneOf = (tone) => TONES[String(tone ?? "").match(/(gray|yellow|amber|orange|green|red|blue)/)?.[1]] ?? null

// A small rounded label in a colour set.
export const Pill = ({ tone = "gray", label, bordered = true, sx }) => {
    const t = TONES[tone] ?? TONES.gray
    return (
        <Chip
            size="small"
            label={label}
            sx={{
                height: 22, flexShrink: 0, fontSize: "0.72rem", fontWeight: 600,
                bgcolor: t.bg, color: t.fg, border: bordered ? `1px solid ${t.bd}` : "none",
                "& .MuiChip-label": { px: 1.25 },
                ...sx,
            }}
        />
    )
}

// `styles` is no longer needed (colours come from the status); still accepted.
export const StatusBadge = ({ status }) => (
    <Pill tone={STATUS_TONE[status] ?? "gray"} label={toTitleCase(status) || "Pending"} />
)

// Whether the signed-in user is the one who filed/owns the record.
export const useIsOwner = (ownerId) => {
    const viewerId = usePage().props.auth?.user?.id
    return ownerId != null && viewerId != null && String(ownerId) === String(viewerId)
}

// "Your Complaint" when the viewer filed it, otherwise "Sarai's Complaint".
export const useOwnerTitle = (ownerId, name, noun, fallback = "Student") =>
    useIsOwner(ownerId) ? `Your ${noun}` : `${name || fallback}'s ${noun}`

// Title with the reference number and status under it; "View PDF" (the
// record's pdf_url, opened in a new tab) on the right, hidden when there is
// none or the viewer can't open it. The right padding keeps clear of the modal's ✕.
// `person`: who filed it (a user, with photo and profile link) or
// `personName` for someone with no account; shown as "<personLabel> <name>".
// `badge`: a ready-made status pill, for statuses outside StatusBadge's list.
export const ModalHeader = ({ title, reference, status, badge, pdfUrl, person, personName, personLabel = "Filed by" }) => (
    <Box sx={{ bgcolor: "action.hover", borderBottom: 1, borderColor: "divider", pl: 3, pr: 6, py: 2, borderTopLeftRadius: 6, borderTopRightRadius: 6 }}>
        <Stack direction="row" sx={{ flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", columnGap: 2, rowGap: 1 }}>
            <Stack direction="row" sx={{ minWidth: 0, alignItems: "center", gap: 1.75 }}>
            {(person || personName) && (
                <Avatar src={person ? getProfilePic(person.profile?.profile_picture, person.profile?.sex) : undefined} alt="" sx={{ width: 48, height: 48, flexShrink: 0 }} />
            )}
            <Box sx={{ minWidth: 0 }}>
                <Typography component="h1" noWrap sx={{ fontSize: "1.125rem", fontWeight: 700, color: "text.primary" }}>{title}</Typography>
                {(person || personName) && (
                    <Typography noWrap sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                        {personLabel}{" "}
                        {person
                            ? <Box component={Link} href={profileUrl(person)} sx={{ color: "text.primary", fontWeight: 600, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
                                {[person.profile?.first_name, person.profile?.last_name].filter(Boolean).join(" ")}
                              </Box>
                            : <Box component="span" sx={{ color: "text.primary", fontWeight: 600 }}>{personName}</Box>}
                        {person && showUserType(person, true) && <> · {showUserType(person, true)}</>}
                    </Typography>
                )}
                <Stack direction="row" sx={{ mt: 0.5, flexWrap: "wrap", alignItems: "center", gap: 1 }}>
                    {reference && <Typography component="span" sx={{ fontFamily: "monospace", fontSize: "0.75rem", color: "text.secondary" }}>#{reference}</Typography>}
                    {badge ?? (status !== undefined && <StatusBadge status={status} />)}
                </Stack>
            </Box>
            </Stack>
            {pdfUrl && (
                <Tooltip title="View PDF">
                    <IconButton
                        aria-label="View PDF"
                        color="primary"
                        onClick={() => openPdfTab(pdfUrl, "PDF") || showOutputModal("Allow pop-ups for this site so the PDF can open in a new tab.", "e")}
                        sx={{ border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}
                    >
                        <PictureAsPdfOutlined fontSize="small" />
                    </IconButton>
                </Tooltip>
            )}
        </Stack>
    </Box>
)

// A card with an icon + title. `tone` ("red", "amber", ...) colours the border.
export const Section = ({ icon: Icon, title, children, tone }) => (
    <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, sm: 2.5 }, minWidth: 0, borderColor: toneOf(tone)?.bd ?? "divider" }}>
        <Stack direction="row" component="h2" sx={{ alignItems: "center", gap: 1, m: 0, mb: 1.5, fontSize: "0.875rem", fontWeight: 600, color: "text.primary" }}>
            <Box component="span" sx={{ display: "flex", color: "text.disabled", flexShrink: 0 }}><Icon size={16} /></Box>
            {title}
        </Stack>
        {children}
    </Paper>
)

// The record's progress: every step it goes through — the ones done (with
// their date) and the ones still ahead — so the user can see where it is
// and what comes next.
//
// steps: [{ label, time, sub, value, state, reason }]
//   "done" green · "failed" red · "stopped" grey (revoked / expired)
//   "upcoming" hollow; the first one is the current step
// A step with a `reason` (a rejection) opens it in a popup when clicked.
export const stepAt = (label, time, schoolYear, state = "done", reason = null) => ({
    label, time, state, reason, sub: schoolYear ? formatSchoolYearSemester(schoolYear) : null,
})
export const stepAhead = (label, value) => ({ label, value, state: "upcoming" })

const DOT_COLOR = { done: "#16a34a", failed: "#dc2626", stopped: "#9ca3af" }

export const Timeline = ({ steps }) => {
    // The current step: the first one ahead — unless the record was just
    // rejected, then nothing is being waited on (the next steps are only possible).
    const next = steps.findIndex((s) => s.state === "upcoming")
    const firstAhead = next > 0 && steps[next - 1].state === "failed" ? -1 : next
    const [shown, setShown] = useState(null) // the step whose reason is open
    return (
        <>
        <Paper variant="outlined" sx={{ borderRadius: 3, px: 1, py: 2, overflowX: "auto" }}>
            {/* Equal columns, each centred on its dot; the line runs dot to dot. */}
            <Box sx={{ display: "flex", minWidth: "fit-content" }}>
                {steps.map((s, i) => {
                    const ahead = s.state === "upcoming"
                    const current = i === firstAhead
                    // Right after a rejection: grey, with its note (e.g. "If the prefect reconsiders").
                    const possible = ahead && steps[i - 1]?.state === "failed"
                    const last = i === steps.length - 1
                    const nextAhead = !last && steps[i + 1].state === "upcoming"
                    return (
                        <Box key={i} title={s.sub ?? undefined} sx={{ flex: 1, minWidth: 120, px: 0.5, position: "relative", textAlign: "center" }}>
                            {!last && (
                                <Box sx={{
                                    position: "absolute", top: 4, left: "calc(50% + 14px)", right: "calc(-50% + 14px)",
                                    borderTop: "1.5px solid", borderTopStyle: nextAhead ? "dashed" : "solid", borderColor: "divider",
                                }} />
                            )}
                            <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
                                <Box
                                    {...(s.reason ? { component: ButtonBase, onClick: () => setShown(s), "aria-label": `${s.label}: view reason` } : {})}
                                    sx={{
                                        width: 10, height: 10, borderRadius: "50%", flexShrink: 0, boxSizing: "border-box",
                                        ...(ahead
                                            ? { border: "2px solid", borderColor: current ? "#f59e0b" : "text.disabled" }
                                            : { bgcolor: DOT_COLOR[s.state] }),
                                        ...(s.reason && { cursor: "pointer", boxShadow: `0 0 0 3px ${TONES.red.bg}`, "&:hover": { boxShadow: `0 0 0 4px ${TONES.red.bd}` } }),
                                    }}
                                />
                            </Box>
                            <Typography sx={{ fontSize: "0.8rem", fontWeight: ahead ? 400 : 600, color: ahead ? (current ? TONES.amber.fg : "text.secondary") : s.state === "failed" ? TONES.red.fg : "text.primary" }}>
                                {s.label}
                            </Typography>
                            <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
                                {s.time ? `${readableDate(s.time)}, ${readableTime(s.time)}` : current || possible ? s.value : ""}
                            </Typography>
                            {s.reason && (
                                <ButtonBase onClick={() => setShown(s)} sx={{ fontSize: "0.72rem", color: TONES.red.fg, textDecoration: "underline", textUnderlineOffset: 2 }}>
                                    View reason
                                </ButtonBase>
                            )}
                        </Box>
                    )
                })}
            </Box>
        </Paper>

        <Dialog open={!!shown} onClose={() => setShown(null)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle sx={{ fontSize: "1rem", fontWeight: 600, pb: 0.5 }}>Reason for {shown?.label === "Rejected" ? "Rejection" : shown?.label}</DialogTitle>
            <DialogContent>
                {shown?.time && <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", mb: 1.5 }}>{readableDate(shown.time)}, {readableTime(shown.time)}</Typography>}
                <Typography sx={{ fontSize: "0.875rem", color: "text.primary", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{shown?.reason}</Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={() => setShown(null)} sx={{ textTransform: "none" }}>Close</Button>
            </DialogActions>
        </Dialog>
        </>
    )
}

// Grey "nothing here" placeholder inside a section: an icon and a line.
export const EmptyNote = ({ icon: Icon, text }) => (
    <Stack sx={{ alignItems: "center", justifyContent: "center", py: 5, color: "text.disabled" }}>
        {Icon && <Box sx={{ display: "flex", mb: 1 }}><Icon size={28} /></Box>}
        <Typography sx={{ fontSize: "0.875rem", fontWeight: 500 }}>{text}</Typography>
    </Stack>
)

// A shaded, scrolling box for long text. `html` renders server-cleaned rich
// text (complaint/referral reasons); otherwise `children`. `tone` tints it.
export const TextBox = ({ html, children, tone, height = 128, sx }) => {
    const t = toneOf(tone)
    return (
        <Box
            sx={{
                height, overflowY: "auto", borderRadius: 1.5, p: 1.5,
                bgcolor: t?.bg ?? "action.hover", color: t?.fg ?? "text.primary",
                fontSize: "0.875rem", lineHeight: 1.65, wordBreak: "break-word",
                // Saved rich text (the editor's formatting; Tailwind's reset
                // would otherwise drop bullets and heading sizes).
                "& p": { m: 0, mb: 1 }, "& p:last-child": { mb: 0 },
                "& h1": { fontSize: "1.3em", fontWeight: 700, m: 0, mb: 0.75 },
                "& h2": { fontSize: "1.15em", fontWeight: 700, m: 0, mb: 0.75 },
                "& h3": { fontSize: "1.02em", fontWeight: 700, m: 0, mb: 0.5 },
                "& ul, & ol": { pl: 2.5, m: 0, mb: 1 },
                "& ul": { listStyle: "disc" }, "& ol": { listStyle: "decimal" },
                "& ul ul": { listStyle: "circle" },
                "& li > p": { mb: 0.25 },
                "& blockquote": { m: 0, mb: 1, pl: 1.5, borderLeft: 3, borderColor: "divider", color: "text.secondary" },
                "& hr": { border: 0, borderTop: 1, borderColor: "divider", my: 1.5 },
                "& u": { textDecoration: "underline" },
                ...sx,
            }}
            {...(html != null ? { dangerouslySetInnerHTML: { __html: html } } : { children })}
        />
    )
}

// "Label: value" on one line.
export const Field = ({ label, children }) => (
    <Typography sx={{ fontSize: "0.875rem" }}>
        <Box component="span" sx={{ color: "text.secondary" }}>{label}: </Box>
        <Box component="span" sx={{ color: "text.primary", fontWeight: 500 }}>{children}</Box>
    </Typography>
)

// A small grey label with its content under it.
export const Labeled = ({ label, children }) => (
    <Box>
        <Typography sx={{ fontSize: "0.875rem", color: "text.secondary", mb: 0.5 }}>{label}:</Typography>
        {children}
    </Box>
)

// Body text inside a section.
export const Text = ({ children, sx }) => (
    <Typography sx={{ fontSize: "0.875rem", color: "text.primary", ...sx }}>{children}</Typography>
)

// "Edited on <date> (<time>)" at the bottom of a "Previous Version" section.
export const EditedOn = ({ children }) => (
    <Typography sx={{ fontSize: "0.75em", color: "text.secondary" }}>Edited on {children}</Typography>
)

// A body column of stacked sections (under the header).
export const RecordBody = ({ children }) => <Stack sx={{ p: 3, gap: 2 }}>{children}</Stack>

// Two sections side by side (one column on phones, or when there is only one).
export const SectionPair = ({ children, single = false }) => (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: single ? "1fr" : "1fr 1fr" } }}>{children}</Box>
)

// Image / video thumbnails that open the file in a new tab.
// `files`: [{ file, type }], `srcOf(file)`: its URL. `small` for the
// "previous version" strip.
export const EvidenceGrid = ({ files, srcOf, small = false, label = "Evidence" }) => (
    <Box sx={{ display: "grid", gap: small ? 1 : 1.5, gridTemplateColumns: small ? { xs: "repeat(3, 1fr)", sm: "repeat(4, 1fr)" } : { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)" } }}>
        {files.map((e, i) => {
            const src = srcOf(e.file)
            const media = { width: "100%", height: small ? 80 : 128, objectFit: "cover", display: "block", transition: "transform .2s" }
            return (
                <Box
                    key={i} component="a" href={src} target="_blank" rel="noreferrer"
                    sx={{ display: "block", borderRadius: 2, overflow: "hidden", border: 1, borderColor: "divider", transition: "box-shadow .2s, border-color .2s", "&:hover": { borderColor: "divider", boxShadow: 1 }, "&:hover img": { transform: small ? "none" : "scale(1.05)" } }}
                >
                    {e.type === 'vid'
                        ? <Box component="video" src={src} controls={!small} sx={media} />
                        : <Box component="img" src={src} alt={`${label} ${i + 1}`} sx={media} />}
                </Box>
            )
        })}
    </Box>
)

// One or more "person" rows — a single user, a list of users (e.g. multiple
// referred students), or a graceful empty state when neither is present
// (a record left with no resolvable subject shouldn't crash the modal).
// `linkable` = false shows the person without a link to their profile.
// The people a record is about (a complaint's subjects, a referral's
// students): each one a card (photo, name, program and year), opening their
// profile when `linkable`.
const PersonCard = ({ user, linkable }) => {
    const name = [user?.profile?.first_name, user?.profile?.last_name].filter(Boolean).join(" ") || "Unknown"
    const role = user ? showUserType(user, true) : null
    return (
        <Box
            {...(linkable ? { component: Link, href: profileUrl(user) } : {})}
            sx={{
                display: "flex", alignItems: "center", gap: 1.5, minWidth: 0,
                px: 1.5, py: 1.25, border: 1, borderColor: "divider", borderRadius: 2,
                bgcolor: "background.paper", color: "inherit", textDecoration: "none",
                transition: "background-color .15s, border-color .15s",
                ...(linkable && { "&:hover": { bgcolor: "action.hover", borderColor: "primary.main" } }),
            }}
        >
            <Avatar src={getProfilePic(user?.profile?.profile_picture, user?.profile?.sex)} alt="" sx={{ width: 40, height: 40, flexShrink: 0 }} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography noWrap sx={{ fontSize: "0.925rem", fontWeight: 600, color: "text.primary", lineHeight: 1.3 }}>{name}</Typography>
                {role && <Typography noWrap sx={{ fontSize: "0.775rem", color: "text.secondary" }}>{role}</Typography>}
            </Box>
            {linkable && <Box component="span" sx={{ display: "flex", color: "text.disabled", flexShrink: 0 }}><ChevronRight size={18} /></Box>}
        </Box>
    )
}

// `action(user)`: a button beside a person's card (outside its link), e.g.
// Intervene.
export const PersonList = ({ data, data_list = null, emptyLabel = 'No one on record.', linkable = true, action }) => {
    const users = data_list?.length ? data_list.map((e) => e.user).filter(Boolean) : (data ? [data] : [])
    if (users.length === 0) {
        return <Typography sx={{ fontSize: "0.875rem", color: "text.secondary" }}>{emptyLabel}</Typography>
    }
    return (
        <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", sm: users.length > 1 ? "1fr 1fr" : "1fr" } }}>
            {users.map((u, i) => {
                const extra = action?.(u)
                return extra
                    ? (
                        <Stack key={u.id ?? i} direction="row" sx={{ alignItems: "center", gap: 1, minWidth: 0 }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}><PersonCard user={u} linkable={linkable} /></Box>
                            {extra}
                        </Stack>
                    )
                    : <PersonCard key={u.id ?? i} user={u} linkable={linkable} />
            })}
        </Box>
    )
}

// Defensive against non-string/malformed values from the backend (a bad
// JSON.parse here throws synchronously during render and blanks the whole
// modal) — always resolves to an array, never throws.
export const safeParseArray = (value) => {
    if (Array.isArray(value)) return value
    if (typeof value !== 'string' || value === '') return []
    try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

// "Filed/Issued by the Prefect: <name>" under the person a record is for,
// when a prefect entered it on their behalf (the record's `prefect`).
// The people on a record in one card: a row per role, the role on the left
// (above, on phones) and the people beside it; several people sit side by side.
// rows: [{ label, content }] — falsy rows are skipped.
export const People = ({ rows }) => (
    <Paper variant="outlined" sx={{ borderRadius: 3, px: { xs: 2, sm: 2.5 } }}>
        {rows.filter(Boolean).map((r, i) => (
            <Box key={i} sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { sm: "center" }, gap: { xs: 1, sm: 2 }, py: 1.75, borderTop: i ? 1 : 0, borderColor: "divider" }}>
                <Typography sx={{ width: { sm: 130 }, flexShrink: 0, fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "text.secondary" }}>
                    {r.label}
                </Typography>
                <Box sx={{ minWidth: 0, flex: 1 }}>{r.content}</Box>
            </Box>
        ))}
    </Paper>
)

// The prefect's name, for a "Filed by" / "Issued by" row.
export const prefectName = (prefect) =>
    [prefect?.profile?.first_name, prefect?.profile?.last_name].filter(Boolean).join(" ") || prefect?.username

export const ByPrefect = ({ prefect, label = "Filed by the Prefect" }) => {
    if (!prefect) return null
    const name = [prefect.profile?.first_name, prefect.profile?.last_name].filter(Boolean).join(" ") || prefect.username
    return (
        <Typography sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: "divider", fontSize: "0.8em", color: "text.secondary" }}>
            {label}: <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>{name}</Box>
        </Typography>
    )
}

// Placeholder shown while a view modal's data is loading from the server,
// shaped like what's coming instead of a spinner:
//   "record" — header, stat boxes, then sections (complaint, referral, ...)
//   "list"   — a few stacked rows (incident / violation / appointment lists)
//   "table"  — a header row plus table rows (file previews)
//   "compact"— a short card (appointment details)
const Bar = ({ w = "100%", h, sx }) => <Skeleton variant="rounded" animation="wave" width={w} height={h} sx={{ transform: "none", ...sx }} />

export const ViewModalSkeleton = ({ variant = "record" }) => {
    if (variant === "list") {
        return (
            <Stack sx={{ gap: 1.5, py: 1 }} aria-busy="true" aria-label="Loading">
                {[0, 1, 2, 3].map((i) => (
                    <Stack key={i} direction="row" sx={{ alignItems: "center", gap: 1.5, border: 1, borderColor: "divider", borderRadius: 2, px: 2, py: 1.5 }}>
                        <Skeleton variant="circular" width={36} height={36} sx={{ flexShrink: 0 }} />
                        <Stack sx={{ flex: 1, gap: 1 }}>
                            <Bar w="50%" h={12} />
                            <Bar w="33%" h={12} />
                        </Stack>
                    </Stack>
                ))}
            </Stack>
        )
    }

    if (variant === "table") {
        return (
            <Stack sx={{ gap: 1, py: 1 }} aria-busy="true" aria-label="Loading">
                <Bar h={32} />
                {[0, 1, 2, 3, 4].map((i) => <Bar key={i} h={24} sx={{ opacity: 0.7 }} />)}
            </Stack>
        )
    }

    if (variant === "compact") {
        return (
            <Stack sx={{ gap: 1.5 }} aria-busy="true" aria-label="Loading">
                <Bar w="66%" h={20} />
                <Bar w="33%" h={12} />
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, pt: 1 }}>
                    <Bar h={48} />
                    <Bar h={48} />
                </Box>
            </Stack>
        )
    }

    return (
        <Box aria-busy="true" aria-label="Loading">
            <Stack direction="row" sx={{ px: 3, py: 2.5, borderBottom: 1, borderColor: "divider", alignItems: "center", gap: 2 }}>
                <Skeleton variant="circular" width={44} height={44} sx={{ flexShrink: 0 }} />
                <Stack sx={{ flex: 1, gap: 1 }}>
                    <Bar w="50%" h={16} />
                    <Bar w="25%" h={12} />
                </Stack>
                <Bar w={80} h={24} sx={{ borderRadius: 999 }} />
            </Stack>
            <Stack sx={{ px: 3, py: 2.5, gap: 2.5 }}>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" }, gap: 1.5 }}>
                    {[0, 1, 2].map((i) => <Bar key={i} h={56} />)}
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                    <Bar h={96} />
                    <Bar h={96} />
                </Box>
                <Bar h={80} />
            </Stack>
        </Box>
    )
}
