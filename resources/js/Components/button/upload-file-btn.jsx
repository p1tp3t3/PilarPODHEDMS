import { Button, CircularProgress } from "@mui/material"

const UploadFileBtn = ({ children, name, accept, change, loading = false }) => {
    return (
        <Button
            component="label"
            variant="contained"
            fullWidth
            disabled={loading}
            disableElevation
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : null}
            sx={{
                textTransform: 'none',
                fontSize: '0.9em',
                borderRadius: '0.375rem',
                bgcolor: '#1d4ed8',
                '&:hover': { bgcolor: '#1e40af' },
            }}
        >
            {loading ? "Uploading..." : children}
            <input
                type="file"
                name={name}
                accept={accept}
                onChange={change}
                disabled={loading}
                hidden
                id={name}
            />
        </Button>
    )
}
export default UploadFileBtn
