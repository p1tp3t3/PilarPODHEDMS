import { Link } from "@inertiajs/react"
import { Box, Button, Divider, Paper, Typography } from "@mui/material"
import { ArrowRight } from "lucide-react"
import ProfilePic from "@/Components/other/profile-pic"
import { getProfilePic, getYearLevel, ordinal, profileUrl } from "@/others/function"

// One detail: a small label over its value.
const Detail = ({ label, value }) => (
    <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "text.secondary" }}>
            {label}
        </Typography>
        <Typography sx={{ fontSize: "0.875rem", fontWeight: 500, color: "text.primary", overflowWrap: "anywhere" }}>
            {value || "N/A"}
        </Typography>
    </Box>
)

// The student at the top of the Student Violation page: photo, name and ID
// number, then their current program, year level, school year and semester.
const StudentHeaderCard = ({ student }) => {
    const p = student?.profile ?? {}
    const latest = student?.enrollments?.[student.enrollments.length - 1]
    const name = [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(" ")

    return (
        <Paper elevation={1} sx={{ borderRadius: "0.5rem", overflow: "hidden" }}>
            <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: "center", gap: { xs: 1.5, sm: 2.5 }, px: { xs: 2, sm: 3 }, py: 2.5, textAlign: { xs: "center", sm: "left" } }}>
                <ProfilePic src={getProfilePic(p.profile_picture, p.sex)} size={4.5} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography component="h2" sx={{ fontSize: "1.2rem", fontWeight: 700, lineHeight: 1.3 }}>{name}</Typography>
                    {student?.id_number && (
                        <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>#{student.id_number}</Typography>
                    )}
                </Box>
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
            </Box>
            <Divider />
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "2fr 1fr 1fr 1fr" }, gap: 2, px: { xs: 2, sm: 3 }, py: 1.75 }}>
                <Detail label="Program" value={student?.program?.name} />
                <Detail label="Year Level" value={latest?.year_level ? getYearLevel(latest.year_level) : null} />
                <Detail label="School Year" value={latest?.school_year?.year} />
                <Detail label="Semester" value={latest?.semester ? `${ordinal(latest.semester)} Semester` : null} />
            </Box>
        </Paper>
    )
}

export default StudentHeaderCard
