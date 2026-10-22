import { Button } from "@mui/material"
import { useTitleActionIcon } from "@/context-provider/page-title-provider"

// `icon` (optional): in a page's title bar, phones show just this icon in a
// round button; the label stays as its tooltip/accessible name (`label`
// overrides the text taken from children).
const Btn = ({ children, onclick, className, icon, label }) => {
    const compact = useTitleActionIcon(icon, children, label)

    return (
        <Button
            onClick={onclick}
            className={className}
            variant="contained"
            disableElevation
            title={compact?.name}
            aria-label={compact?.name}
            sx={{
                px: 2,
                py: 1,
                fontSize: '0.9em',
                borderRadius: '0.375rem',
                textTransform: 'none',
                bgcolor: '#1d4ed8',
                '&:hover': { bgcolor: '#1e40af' },
                ...compact?.sx,
            }}
        >
            {compact ? compact.content : children}
        </Button>
    )
}
export default Btn
