import { Button } from "@mui/material"

const FormButton = ({
  label,
  type = 'button',
  click = () => {},
  enable = true,
  loading = false
}) => {
  return (
    <Button
      type={type}
      onClick={click}
      disabled={!enable}
      loading={loading}
      variant="contained"
      disableElevation
      sx={{
        borderRadius: '999px',
        px: '3rem',
        py: '0.55rem',
        fontSize: '13px',
        textTransform: 'uppercase',
        bgcolor: 'rgb(0, 55, 156)',
        '&:hover': { bgcolor: '#00277a' },
      }}
    >
      {label}
    </Button>
  )
}

export default FormButton
