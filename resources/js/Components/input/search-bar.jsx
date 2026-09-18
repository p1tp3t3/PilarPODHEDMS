import { TextField, InputAdornment, IconButton } from "@mui/material"
import { Search, X } from "lucide-react"

const SearchBar = (props) => {
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
                placeholder={props.plc}
                sx={{
                    "& .MuiOutlinedInput-root": {
                        borderRadius: "10rem",
                        backgroundColor: "rgb(229 231 235)",
                        "& fieldset": { borderColor: "rgb(107 114 128)" },
                        "&:hover fieldset": { borderColor: "rgb(17 24 39)" },
                        "&.Mui-focused fieldset": { borderColor: "rgb(17 24 39)", borderWidth: "1px" },
                    },
                    // @tailwindcss/forms resets every native input/select/textarea
                    // site-wide (registered without `strategy: 'class'` in
                    // tailwind.config.js), giving this one — still a real <input>
                    // under MUI's TextField — its own blue focus ring via
                    // box-shadow/border-color on top of MUI's fieldset border.
                    "& .MuiOutlinedInput-input": {
                        outline: "none",
                        boxShadow: "none",
                        border: "none",
                        "&:focus": { outline: "none", boxShadow: "none", border: "none" },
                        "&:focus-visible": { outline: "none", boxShadow: "none", border: "none" },
                    },
                }}
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search size={14} />
                            </InputAdornment>
                        ),
                        endAdornment: props.search ? (
                            <InputAdornment position="end">
                                <IconButton size="small" edge="end" onClick={() => props.setSearch("")}>
                                    <X size={14} />
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
