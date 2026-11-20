import { Tooltip } from "@mui/material"

// How many times the one who filed a record (complaint, absent form,
// referral, gate pass) can still edit it while it's pending (LimitsEdits on
// the server: up to 3).
export const MAX_EDITS = 3

// "You can edit it 2 more times." / "This is your last edit."
export const editsLeftSentence = (left) => {
    const after = Math.max(0, (left ?? MAX_EDITS) - 1)
    return after === 0
        ? "This Is Your Last Edit."
        : `You Can Edit It ${after} More Time${after === 1 ? "" : "s"} After This.`
}

// The small label beside Edit in a list: "2 of 3 edits left".
const EditsLeft = ({ left }) => {
    const n = left ?? MAX_EDITS
    const tone = n === 0 ? "gray" : n === 1 ? "amber" : "blue"
    return (
        <Tooltip title={`Each record can be edited up to ${MAX_EDITS} times while it is pending.`}>
            <span
                className="inline-block px-2 py-1 rounded-xl leading-none whitespace-nowrap font-medium text-[0.75em] self-center"
                style={{ backgroundColor: `var(--tone-${tone}-bg)`, color: `var(--tone-${tone}-fg)`, border: `1px solid var(--tone-${tone}-bd)` }}
            >
                {n === 0 ? "No edits left" : `${n} of ${MAX_EDITS} edits left`}
            </span>
        </Tooltip>
    )
}

export default EditsLeft
