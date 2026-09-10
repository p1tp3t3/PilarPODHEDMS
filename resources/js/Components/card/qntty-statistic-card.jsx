import { Card, CardActionArea, CardContent, Box, Typography, Tooltip } from "@mui/material";

// Tailwind needs literal class strings to generate them at build time, so the
// handful of accent colors callers pass via `textColor` are mapped here
// rather than derived by string-concatenating a class name at runtime.
const ACCENT_COLORS = {
    "text-blue-700": { bg: "bg-blue-100", text: "text-blue-700" },
    "text-green-700": { bg: "bg-green-100", text: "text-green-700" },
    "text-amber-700": { bg: "bg-amber-100", text: "text-amber-700" },
};
const DEFAULT_ACCENT = { bg: "bg-blue-100", text: "text-blue-600" };

const QuantityCard = ({ label, icon: Icon, num, h = "h-[6rem]", textColor }) => {
    const accent = ACCENT_COLORS[textColor] ?? DEFAULT_ACCENT;

    return (
        <Tooltip title={`${label}: ${num}`} arrow placement="top">
        <Card
            elevation={1}
            className={h}
            sx={{
                width: "100%",
                borderRadius: "0.5rem",
                transition: "box-shadow 0.2s ease",
                "&:hover": { boxShadow: 4 },
            }}
        >
            <CardActionArea
                component="div"
                sx={{
                    height: "100%",
                    "& .MuiCardActionArea-focusHighlight": { borderRadius: "0.5rem" },
                }}
            >
                <CardContent
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        height: "100%",
                        "&:last-child": { pb: 2 },
                    }}
                >
                    <Box
                        className={`${accent.bg} ${accent.text}`}
                        sx={{
                            flexShrink: 0,
                            width: "3.3rem",
                            height: "3.3rem",
                            borderRadius: "50%",
                            display: "grid",
                            placeItems: "center",
                            fontSize: "1.5rem",
                        }}
                    >
                        <Icon size="1.5rem" />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: "1.3em", lineHeight: 1.2 }}>
                            {num}
                        </Typography>
                        <Typography
                            noWrap
                            sx={{ fontSize: "0.7em", fontWeight: 700, color: "text.secondary" }}
                        >
                            {label}
                        </Typography>
                    </Box>
                </CardContent>
            </CardActionArea>
        </Card>
        </Tooltip>
    );
};
export default QuantityCard;
