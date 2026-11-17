import { Box, Skeleton } from "@mui/material";

/**
 * Loading placeholder for a list (MUI Skeleton): rows shaped like the
 * list's own (MuiRow): an avatar circle and two lines of text.
 * variant="card": rounded blocks, for lists of cards. `avatar={false}`:
 * rows without the circle. CircleReload stays for buttons, modals and the
 * full-page overlay.
 */
const ListSkeleton = ({ rows = 5, height = 3.5, variant = "row", avatar = true }) => {
    if (variant === "card") {
        return (
            <Box sx={{ width: "100%", justifySelf: "stretch", display: "grid", gap: 1.5 }} aria-busy="true" aria-label="Loading">
                {Array.from({ length: rows }).map((_, i) => (
                    <Skeleton key={i} variant="rounded" height={`${height * 1.6}rem`} />
                ))}
            </Box>
        );
    }

    return (
        <Box sx={{ width: "100%", justifySelf: "stretch" }} aria-busy="true" aria-label="Loading">
            {Array.from({ length: rows }).map((_, i) => (
                <Box
                    key={i}
                    sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.25, px: 1.5, borderBottom: i < rows - 1 ? 1 : 0, borderColor: "divider" }}
                >
                    {avatar && <Skeleton variant="circular" width={38} height={38} sx={{ flexShrink: 0 }} />}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Skeleton width={`${55 - (i % 3) * 8}%`} height={18} />
                        <Skeleton width={`${30 + (i % 2) * 10}%`} height={14} />
                    </Box>
                    <Skeleton variant="rounded" width={48} height={16} sx={{ flexShrink: 0 }} />
                </Box>
            ))}
        </Box>
    );
};

export default ListSkeleton;
