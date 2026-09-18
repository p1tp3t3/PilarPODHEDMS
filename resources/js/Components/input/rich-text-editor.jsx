import { useEditor, useEditorState, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { useEffect, useState } from "react"
import "./rich-text-editor.css"
import { Bold, Italic, Strikethrough, Heading, List, ListOrdered, Quote, RotateCcw, RotateCw, Maximize2, Minimize2 } from "lucide-react"

const RichTextEditor = ({ label, val = "", change, error, req = false, placeholder = "", minHeight = "20rem" }) => {
    const [expanded, setExpanded] = useState(false)

    const editor = useEditor({
        extensions: [StarterKit, Placeholder.configure({ placeholder })],
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

    // Tiptap v3's useEditor no longer re-renders this component on every
    // transaction (only content changes bubble out via onUpdate/`change`) —
    // so toggling a mark with nothing selected (no doc change, just pending
    // "stored marks") never re-ran this render, and the toolbar button's
    // active state looked permanently stuck. useEditorState subscribes to
    // exactly the derived bits the toolbar needs and re-renders on those.
    const toolbarState = useEditorState({
        editor,
        selector: ({ editor: e }) => ({
            isBold: e?.isActive("bold") ?? false,
            isItalic: e?.isActive("italic") ?? false,
            isStrike: e?.isActive("strike") ?? false,
            isHeading: e?.isActive("heading", { level: 2 }) ?? false,
            isBulletList: e?.isActive("bulletList") ?? false,
            isOrderedList: e?.isActive("orderedList") ?? false,
            isBlockquote: e?.isActive("blockquote") ?? false,
            canUndo: e?.can().undo() ?? false,
            canRedo: e?.can().redo() ?? false,
        }),
    })

    // Expanded mode covers the full viewport (above UpModal's z-[200], since
    // this is most often used inside one) rather than just growing taller,
    // and blocks background scroll while active like a modal would.
    useEffect(() => {
        if (!expanded) return
        document.body.style.overflow = "hidden"
        return () => {
            document.body.style.overflow = "auto"
        }
    }, [expanded])

    if (!editor) return null

    const box = (
        <div className={`w-full border rounded-md overflow-hidden flex flex-col ${expanded ? "h-full" : ""} ${error ? "border-[#d12323]" : "border-gray-300 focus-within:border-blue-700"}`}>
            <Toolbar editor={editor} state={toolbarState} expanded={expanded} onToggleExpand={() => setExpanded((e) => !e)} />
            <div
                className="p-3 cursor-text overflow-y-auto flex-1"
                style={!expanded ? { minHeight } : undefined}
                onClick={() => editor.chain().focus().run()}
            >
                <EditorContent editor={editor} />
            </div>
        </div>
    )

    if (expanded) {
        return (
            <div className="fixed inset-0 z-[300] bg-white p-4 flex flex-col gap-1">
                {label && (
                    <label className="text-[0.85em] font-medium text-gray-700">
                        {label} {req && <span className="text-[#d12323]">*</span>}
                    </label>
                )}
                {box}
                {error && <div className="text-[#d12323] text-[13px] font-[600]">{error}</div>}
            </div>
        )
    }

    return (
        <div className="w-full flex flex-col gap-1">
            {label && (
                <label className="text-[0.85em] font-medium text-gray-700">
                    {label} {req && <span className="text-[#d12323]">*</span>}
                </label>
            )}
            {box}
            {error && <div className="text-[#d12323] text-[13px] font-[600]">{error}</div>}
        </div>
    )
}

const ToolbarBtn = ({ onClick, active, disabled, children, title, className = "" }) => (
    <button
        type="button"
        title={title}
        disabled={disabled}
        // A plain onClick fires after the browser's mousedown already blurred
        // the contentEditable and collapsed its selection — so "Bold" on
        // selected text had nothing left to apply to. Preventing default on
        // mousedown keeps the editor's selection intact through the click.
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        className={`w-8 h-8 grid place-items-center rounded transition-colors ${
            active ? "bg-blue-700 text-white" : "text-gray-700 hover:bg-gray-200"
        } ${disabled ? "opacity-40 cursor-not-allowed" : ""} ${className}`}
    >
        {children}
    </button>
)

const Toolbar = ({ editor, state, expanded, onToggleExpand }) => (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
        <ToolbarBtn title="Bold" onClick={() => editor.chain().focus().toggleBold().run()} active={state.isBold}>
            <Bold size="0.85em" />
        </ToolbarBtn>
        <ToolbarBtn title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} active={state.isItalic}>
            <Italic size="0.85em" />
        </ToolbarBtn>
        <ToolbarBtn title="Strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()} active={state.isStrike}>
            <Strikethrough size="0.85em" />
        </ToolbarBtn>
        <div className="w-[1px] h-5 bg-gray-300 mx-1"></div>
        <ToolbarBtn title="Heading" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={state.isHeading}>
            <Heading size="0.85em" />
        </ToolbarBtn>
        <ToolbarBtn title="Bullet List" onClick={() => editor.chain().focus().toggleBulletList().run()} active={state.isBulletList}>
            <List size="0.85em" />
        </ToolbarBtn>
        <ToolbarBtn title="Numbered List" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={state.isOrderedList}>
            <ListOrdered size="0.85em" />
        </ToolbarBtn>
        <ToolbarBtn title="Quote" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={state.isBlockquote}>
            <Quote size="0.85em" />
        </ToolbarBtn>
        <div className="w-[1px] h-5 bg-gray-300 mx-1"></div>
        <ToolbarBtn title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!state.canUndo}>
            <RotateCcw size="0.85em" />
        </ToolbarBtn>
        <ToolbarBtn title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!state.canRedo}>
            <RotateCw size="0.85em" />
        </ToolbarBtn>
        <ToolbarBtn title={expanded ? "Collapse" : "Expand"} onClick={onToggleExpand} active={expanded} className="ml-auto">
            {expanded ? <Minimize2 size="0.85em" /> : <Maximize2 size="0.85em" />}
        </ToolbarBtn>
    </div>
)

export default RichTextEditor
