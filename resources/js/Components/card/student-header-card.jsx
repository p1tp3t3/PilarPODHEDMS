import { Link } from "@inertiajs/react"
import { Box, Button, Paper, Stack, Typography } from "@mui/material"
import { ArrowRight } from "lucide-react"
import ProfilePic from "@/Components/other/profile-pic"
import { getProfilePic, getYearLevel, ordinal, profileUrl } from "@/others/function"

// The student at the top of the Student Violation page, in one compact row:
// photo, name, then ID number · program · year level · school year and
// semester on one line; "View Profile" on the right.
const StudentHeaderCard = ({ student }) => {
    const p = student?.profile ?? {}
    const latest = student?.enrollments?.[student.enrollments.length - 1]
    const name = [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(" ")
    const meta = [
        student?.id_number && `#${student.id_number}`,
        student?.program?.name,
        latest?.year_level && getYearLevel(latest.year_level),
        [latest?.school_year?.year, latest?.semester && `${ordinal(latest.semester)} Semester`].filter(Boolean).join(", "),
    ].filter(Boolean)

    return (
        <Paper variant="outlined" sx={{ borderRadius: 3, px: { xs: 2, sm: 2.5 }, py: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} sx={{ alignItems: { xs: "flex-start", sm: "center" }, gap: { xs: 1.5, sm: 2 } }}>
                <Stack direction="row" sx={{ alignItems: "center", gap: 2, flex: 1, minWidth: 0 }}>
                    <ProfilePic src={getProfilePic(p.profile_picture, p.sex)} size={3.5} />
                    <Box sx={{ minWidth: 0 }}>
                        <Typography component="h2" sx={{ fontSize: "1.1rem", fontWeight: 700, lineHeight: 1.3 }}>{name}</Typography>
                        <Typography sx={{ fontSize: "0.82rem", color: "text.secondary", mt: 0.25 }}>
                            {meta.map((m, i) => (
                                <Box component="span" key={i}>
                                    {i > 0 && <Box component="span" sx={{ mx: 0.75, opacity: 0.6 }}>·</Box>}
                                    {m}
                                </Box>
                            ))}
                        </Typography>
                    </Box>
                </Stack>
                {student?.encrypted_id && (
                    <Button
                        component={Link}
                        href={profileUrl(student)}
                        variant="outlined"
                        size="small"
                        endIcon={<ArrowRight size={15} />}
                        sx={{ textTransform: "none", fontWeight: 600, borderRadius: "8px", flexShrink: 0 }}
                    >
                        View Profile
                    </Button>
                )}
            </Stack>
        </Paper>
    )
}

export default StudentHeaderCard
