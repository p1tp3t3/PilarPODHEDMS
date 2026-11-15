import { TextField, InputAdornment, IconButton } from "@mui/material"
import { SearchRounded, CloseRounded } from "@mui/icons-material"

// A plain MUI search field (outlined, small, pill-shaped). `handleSearch` gets the change event; the clear button sends it an
// empty value too, so the list it filters resets.
const SearchBar = (props) => {
    const clear = () => {
        props.setSearch?.("")
        props.handleSearch?.({ target: { value: "", name: props.name } })
    }

    return (
        <div className={props.w ?? "w-full"}>
            <TextField
                fullWidth
                size="small"
                type="text"
                name={props.name}
                id={props.name}
                onChange={props.handleSearch}
                onFocus={() => props.focus?.(true)}
                onBlur={() => props.focus?.(false)}
                value={props.search ?? ""}
                placeholder={props.plc ?? "Search..."}
                sx={{
                    // Pill-shaped (fully rounded), like the phone lists' search.
                    "& .MuiOutlinedInput-root": { bgcolor: "background.paper", borderRadius: 999 },
                    // @tailwindcss/forms styles every native input site-wide;
                    // keep MUI's own border/focus ring only.
                    "& .MuiOutlinedInput-input": {
                        outline: "none",
                        boxShadow: "none",
                        border: "none",
                        "&:focus": { outline: "none", boxShadow: "none", border: "none" },
                    },
                }}
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchRounded fontSize="small" />
                            </InputAdornment>
                        ),
                        endAdornment: props.search ? (
                            <InputAdornment position="end">
                                <IconButton size="small" edge="end" aria-label="Clear search" onClick={clear}>
                                    <CloseRounded fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ) : null,
                    },
                }}
            />
        </div>
    )
}

export default SearchBar
