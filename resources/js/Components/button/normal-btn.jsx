import { Button } from "@mui/material"

const Btn = ({ children, onclick, className }) => {
    return (
        <Button
            onClick={onclick}
            className={className}
            variant="contained"
            disableElevation
            sx={{
                px: 2,
                py: 1,
                fontSize: '0.9em',
                borderRadius: '0.375rem',
                textTransform: 'none',
                bgcolor: '#1d4ed8',
                '&:hover': { bgcolor: '#1e40af' },
            }}
        >
            {children}
        </Button>
    )
}
export default Btn
