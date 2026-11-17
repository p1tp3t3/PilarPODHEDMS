import { Box, Divider, Paper, Typography } from "@mui/material"

// A section of the profile page (Personal Information, Contact ...): an MUI
// Paper with the blue accent on its left, a title with its icon, an
// optional `side` element and a divider above the content.
const ProfileSectionWrapper = ({ title, icon: Icon = null, side = null, children }) => {
    return (
        <Paper elevation={2} sx={{ px: 2.5, py: 2.25, borderLeft: "5px solid #3498db", borderRadius: 1 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
                <Typography component="h1" sx={{ fontWeight: 700, fontSize: "1.2em", display: "flex", alignItems: "center", gap: 1.5 }}>
                    {Icon && <Icon size="1em" />}
                    <span>{title}</span>
                </Typography>
                {side && <Box>{side}</Box>}
            </Box>
            <Divider sx={{ my: 1.5 }} />
            {children}
        </Paper>
    );
}
export default ProfileSectionWrapper
