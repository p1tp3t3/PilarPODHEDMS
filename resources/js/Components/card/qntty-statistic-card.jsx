import { Card, CardActionArea, CardContent, Box, Typography, Tooltip } from "@mui/material";

// Every quantity card uses the same blue icon accent.
const ACCENT = { bg: "bg-blue-100", text: "text-blue-600" };

const QuantityCard = ({ label, icon: Icon, num, h = "h-[6rem]" }) => {
    const accent = ACCENT;

    return (
        <Tooltip title={`${label}: ${num}`} arrow placement="top">
        <Card
            elevation={1}
            className={`${h} max-md:!h-auto`}
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
                        "@media (max-width:767px)": { py: 1.5, "&:last-child": { pb: 1.5 } },
                    }}
                >
                    <Box
                        className={`${accent.bg} ${accent.text}`}
                        sx={{
                            flexShrink: 0,
                            width: { xs: "2.75rem", md: "3.3rem" },
                            height: { xs: "2.75rem", md: "3.3rem" },
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
