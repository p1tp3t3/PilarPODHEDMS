import ProfileSectionWrapper from "@/wrapper/profile-section-wrapper"
import { getYearLevel, readableDate, replaceUnderScoreToSpace, toTitleCase } from "@/others/function"
import { GraduationCap, FolderOpen } from "lucide-react"
import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material"
import { MuiListEmpty } from "@/Components/list/mui-list-parts"

// A student's enrollments, newest first, as MUI cards.
const EnrollmentHistory = ({ enrollments = [] }) => {
    const history = [...enrollments].reverse()

    return (
        <ProfileSectionWrapper title="Enrollment History" icon={GraduationCap}>
            {history.length === 0 ? (
                <MuiListEmpty icon={FolderOpen} title="No enrollment records found." />
            ) : (
                <Stack spacing={1.5}>
                    {history.map((e, i) => (
                        <Card key={e.id ?? i} variant="outlined" sx={{ borderRadius: 2, bgcolor: "action.hover" }}>
                            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                                <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                                    <Typography sx={{ fontWeight: 600, fontSize: "0.9rem" }}>
                                        {e.school_year?.year} {e.semester ? `· ${e.semester} Semester` : ''}
                                    </Typography>
                                    <Chip
                                        size="small"
                                        variant="outlined"
                                        color={e.dropped_at ? "default" : "primary"}
                                        label={e.status ? toTitleCase(replaceUnderScoreToSpace(e.status)) : 'N/A'}
                                    />
                                </Box>
                                <Typography sx={{ fontSize: "0.85rem", color: "text.secondary", mt: 0.5 }}>
                                    {e.program?.code ?? 'N/A'}
                                    {e.year_level != null ? ` · ${getYearLevel(e.year_level)}` : ''}
                                </Typography>
                                {e.dropped_at && (
                                    <Typography sx={{ fontSize: "0.78rem", color: "text.disabled", mt: 0.5 }}>
                                        Dropped {readableDate(e.dropped_at)}
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
            )}
        </ProfileSectionWrapper>
    )
}

export default EnrollmentHistory
