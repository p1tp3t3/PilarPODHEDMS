import { useEditor, useEditorState, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Box, Divider, FormHelperText, IconButton, MenuItem, Paper, Select, Tooltip, Typography } from "@mui/material"
import "./rich-text-editor.css"
import {
    Bold, Italic, Underline, Strikethrough, List, ListOrdered, ListIndentIncrease, ListIndentDecrease,
    Quote, Minus, RemoveFormatting, Undo2, Redo2, Maximize2, Minimize2,
} from "lucide-react"

// A rich text box for writing reasons, notes and other documents (Tiptap,
// MUI toolbar). Only document formatting: text style (normal / headings),
// bold, italic, underline, strikethrough, lists (with indent), quote and a
// horizontal line — no code, code blocks or links (StarterKit's are turned
// off). Everything it can produce is kept by the server's clean_rich_text().
const RichTextEditor = ({ label, val = "", change, error, req = false, placeholder = "", minHeight = "20rem" }) => {
    const [expanded, setExpanded] = useState(false)

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                code: false,
                codeBlock: false,
                link: false,
                heading: { levels: [1, 2, 3] },
            }),
            Placeholder.configure({ placeholder }),
        ],
        content: val,
        // TipTap's "empty" state is the HTML "<p></p>", not "" — reporting
        // that verbatim would make every consumer's `=== ''` / `.trim()`
        // required-field check treat a cleared-out editor as filled in.
        onUpdate: ({ editor }) => change?.(editor.isEmpty ? "" : editor.getHTML()),
        editorProps: {
            attributes: {
                class: "rte-content text-[13px] focus:outline-none",
            },
        },
    })

    // Keep the editor in sync whenever `val` changes from outside (reset after
    // submit, or a modal that stays mounted while switching between records
    // instead of remounting per record). Guarded by comparing against the
    // editor's own current HTML so this doesn't fight typing — onUpdate
    // already pushes every keystroke back into `val`, so the two only
    // diverge on an external change.
    useEffect(() => {
        if (editor && val !== editor.getHTML()) {
            editor.commands.setContent(val || "")
        }
    }, [val, editor])

    // Tiptap v3's useEditor doesn't re-render on every transaction, so the
    // toolbar subscribes to exactly the bits it shows (active marks, the
    // current text style, undo/redo).
    const state = useEditorState({
        editor,
        selector: ({ editor: e }) => ({
            bold: e?.isActive("bold") ?? false,
            italic: e?.isActive("italic") ?? false,
            underline: e?.isActive("underline") ?? false,
            strike: e?.isActive("strike") ?? false,
            bulletList: e?.isActive("bulletList") ?? false,
            orderedList: e?.isActive("orderedList") ?? false,
            blockquote: e?.isActive("blockquote") ?? false,
            block: [1, 2, 3].find((l) => e?.isActive("heading", { level: l })) ?? 0,
            canIndent: e?.can().sinkListItem("listItem") ?? false,
            canOutdent: e?.can().liftListItem("listItem") ?? false,
            canUndo: e?.can().undo() ?? false,
            canRedo: e?.can().redo() ?? false,
        }),
    })

    // Expanded mode covers the whole window (above modals) and blocks the
    // page's scroll while open.
    useEffect(() => {
        if (!expanded) return
        document.body.style.overflow = "hidden"
        return () => {
            document.body.style.overflow = "auto"
        }
    }, [expanded])

    if (!editor) return null

    const box = (
        <Paper
            variant="outlined"
            sx={{
                width: "100%", display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: 1.5,
                ...(expanded && { flex: 1, minHeight: 0 }),
                borderColor: error ? "error.main" : "divider",
                "&:focus-within": { borderColor: error ? "error.main" : "primary.main", boxShadow: (t) => `0 0 0 1px ${error ? t.palette.error.main : t.palette.primary.main}` },
            }}
        >
            <Toolbar editor={editor} state={state} expanded={expanded} onToggleExpand={() => setExpanded((e) => !e)} />
            <Box
                sx={{ p: 1.5, cursor: "text", overflowY: "auto", flex: 1, color: "text.primary", ...(!expanded && { minHeight }) }}
                onClick={() => editor.chain().focus().run()}
            >
                <EditorContent editor={editor} />
            </Box>
        </Paper>
    )

    const field = (
        <>
            {label && (
                <Typography component="label" sx={{ fontSize: "0.85em", fontWeight: 500, color: "text.secondary" }}>
                    {label} {req && <Box component="span" sx={{ color: "error.main" }}>*</Box>}
                </Typography>
            )}
            {box}
            {error && <FormHelperText error sx={{ m: 0, fontSize: 13, fontWeight: 600 }}>{error}</FormHelperText>}
        </>
    )

    // Rendered straight into <body>: inside the page (or a modal) an animated
    // ancestor's transform makes `fixed` relative to that box instead of the
    // window. Above the sidebar, header and modals.
    if (expanded) {
        return createPortal(
            <Box sx={{ position: "fixed", inset: 0, zIndex: 1000, bgcolor: "background.paper", p: 2, display: "flex", flexDirection: "column", gap: 0.5 }}>
                {field}
            </Box>,
            document.body
        )
    }

    return <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 0.5 }}>{field}</Box>
}

// One toolbar button: an icon with a tooltip; highlighted while active.
const ToolbarBtn = ({ title, onClick, active = false, disabled = false, children }) => (
    <Tooltip title={title} disableInteractive>
        <span>
            <IconButton
                size="small"
                aria-label={title}
                aria-pressed={active}
                disabled={disabled}
                // A plain click fires after mousedown already blurred the editor
                // and dropped its selection; keep the selection through the click.
                onMouseDown={(e) => e.preventDefault()}
                onClick={onClick}
                sx={{
                    width: 30, height: 30, borderRadius: 1, color: active ? "primary.main" : "text.secondary",
                    bgcolor: active ? "action.selected" : "transparent",
                    "&:hover": { bgcolor: active ? "action.selected" : "action.hover" },
                }}
            >
                {children}
            </IconButton>
        </span>
    </Tooltip>
)

const Sep = () => <Divider orientation="vertical" flexItem sx={{ mx: 0.25, my: 0.75 }} />

const BLOCKS = [
    { value: 0, label: "Normal text" },
    { value: 1, label: "Heading 1" },
    { value: 2, label: "Heading 2" },
    { value: 3, label: "Heading 3" },
]

const Toolbar = ({ editor, state, expanded, onToggleExpand }) => {
    const run = (fn) => () => fn(editor.chain().focus()).run()
    const setBlock = (level) => {
        const c = editor.chain().focus()
        ;(level ? c.setHeading({ level }) : c.setParagraph()).run()
    }
    const icon = { size: 16 }

    return (
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.125, px: 0.75, py: 0.5, borderBottom: 1, borderColor: "divider", bgcolor: "action.hover" }}>
            <Select
                size="small"
                value={state.block}
                onChange={(e) => setBlock(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                inputProps={{ "aria-label": "Text style" }}
                MenuProps={{ disablePortal: expanded, sx: { zIndex: 1300 } }}
                sx={{ height: 30, width: 118, fontSize: "0.8rem", bgcolor: "background.paper", mr: 0.25, "& .MuiSelect-select": { py: 0.5, pl: 1.25 } }}
            >
                {BLOCKS.map((b) => (
                    <MenuItem key={b.value} value={b.value} sx={{ fontSize: b.value ? `${1.15 - b.value * 0.08}rem` : "0.85rem", fontWeight: b.value ? 700 : 400 }}>
                        {b.label}
                    </MenuItem>
                ))}
            </Select>
            <Sep />
            <ToolbarBtn title="Bold (Ctrl+B)" active={state.bold} onClick={run((c) => c.toggleBold())}><Bold {...icon} /></ToolbarBtn>
            <ToolbarBtn title="Italic (Ctrl+I)" active={state.italic} onClick={run((c) => c.toggleItalic())}><Italic {...icon} /></ToolbarBtn>
            <ToolbarBtn title="Underline (Ctrl+U)" active={state.underline} onClick={run((c) => c.toggleUnderline())}><Underline {...icon} /></ToolbarBtn>
            <ToolbarBtn title="Strikethrough" active={state.strike} onClick={run((c) => c.toggleStrike())}><Strikethrough {...icon} /></ToolbarBtn>
            <Sep />
            <ToolbarBtn title="Bullet list" active={state.bulletList} onClick={run((c) => c.toggleBulletList())}><List {...icon} /></ToolbarBtn>
            <ToolbarBtn title="Numbered list" active={state.orderedList} onClick={run((c) => c.toggleOrderedList())}><ListOrdered {...icon} /></ToolbarBtn>
            <ToolbarBtn title="Decrease indent" disabled={!state.canOutdent} onClick={run((c) => c.liftListItem("listItem"))}><ListIndentDecrease {...icon} /></ToolbarBtn>
            <ToolbarBtn title="Increase indent" disabled={!state.canIndent} onClick={run((c) => c.sinkListItem("listItem"))}><ListIndentIncrease {...icon} /></ToolbarBtn>
            <Sep />
            <ToolbarBtn title="Quote" active={state.blockquote} onClick={run((c) => c.toggleBlockquote())}><Quote {...icon} /></ToolbarBtn>
            <ToolbarBtn title="Horizontal line" onClick={run((c) => c.setHorizontalRule())}><Minus {...icon} /></ToolbarBtn>
            <ToolbarBtn title="Clear formatting" onClick={run((c) => c.unsetAllMarks().clearNodes())}><RemoveFormatting {...icon} /></ToolbarBtn>
            <Sep />
            <ToolbarBtn title="Undo (Ctrl+Z)" disabled={!state.canUndo} onClick={run((c) => c.undo())}><Undo2 {...icon} /></ToolbarBtn>
            <ToolbarBtn title="Redo (Ctrl+Y)" disabled={!state.canRedo} onClick={run((c) => c.redo())}><Redo2 {...icon} /></ToolbarBtn>
            <Box sx={{ ml: "auto" }}>
                <ToolbarBtn title={expanded ? "Exit full screen" : "Full screen"} active={expanded} onClick={onToggleExpand}>
                    {expanded ? <Minimize2 {...icon} /> : <Maximize2 {...icon} />}
                </ToolbarBtn>
            </Box>
        </Box>
    )
}

export default RichTextEditor
