import { Avatar, Badge } from "@mui/material"

/**
 * A user's photo: an MUI Avatar, `size` in rem. `showActive` adds the
 * online dot (green when `isActive`, orange otherwise) as an MUI Badge;
 * `activeSize` is the dot's size in rem. `border`: { size (px), color }.
 */
const ProfilePic = ({
    size = 4,
    activeSize = 1,
    src = null,
    showActive = false,
    activeBorderColor = 'border-white border-[2px]',
    isActive = false,
    border = { size: '', color: '' }
}) => {
    // The dot's ring: the width in the old class (border-[3px] ...), white.
    const ring = Number(/border-\[(\d+)px\]/.exec(activeBorderColor)?.[1] ?? 2)

    const avatar = (
        <Avatar
            src={src ?? undefined}
            alt=""
            id="profile-picture"
            sx={{
                width: `${size}rem`,
                height: `${size}rem`,
                flexShrink: 0,
                ...(border?.size ? { border: `${border.size}px solid ${border.color}` } : {}),
            }}
        />
    )

    if (!showActive) return avatar

    return (
        <Badge
            overlap="circular"
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            variant="dot"
            sx={{
                flexShrink: 0,
                "& .MuiBadge-dot": {
                    width: `${activeSize}rem`,
                    height: `${activeSize}rem`,
                    minWidth: 0,
                    borderRadius: "50%",
                    bgcolor: isActive ? "#16a34a" : "#f97316",
                    boxShadow: `0 0 0 ${ring}px var(--dm-surface, #fff)`,
                    // Sits on the photo's edge, as before.
                    transform: "scale(1) translate(15%, 15%)",
                },
            }}
        >
            {avatar}
        </Badge>
    )
}

export default ProfilePic
