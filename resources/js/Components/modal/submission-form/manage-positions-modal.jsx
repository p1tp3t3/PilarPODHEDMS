import UpModal from "../up-modal"
import Btn from "@/Components/button/normal-btn"
import ActionBtn from "@/Components/button/action-btn"
import { useState } from "react"
import { PositionService } from "@/others/services/position-service"
import { showWarningModal } from "@/others/function"
import { Pencil, Trash2, X, Check, Lock } from "lucide-react"

// Mirrors AccountController::PROTECTED_POSITIONS — these can't be renamed
// or deleted server-side (they're load-bearing: gate pass verification,
// referral intake/forwarding, and the teaching_staff role hierarchy all key
// off the exact stored name), so their Edit/Delete actions are disabled
// here too instead of only surfacing the 403 after the fact.
const PROTECTED_POSITIONS = ["Guard", "Guidance", "IT Staff", "faculty", "program_head"]

// 'faculty'/'program_head' are stored in snake_case (matching the old enum
// values every backend comparison still relies on) but should never be
// shown to a user that way — every other place in the app that displays a
// teaching staff's position already renders these as plain text.
const DISPLAY_NAMES = {
    faculty: "Faculty",
    program_head: "Program Head",
}
const displayName = (name) => DISPLAY_NAMES[name] ?? name

const ManagePositionsModal = ({ close, closeModal, positions, setPositions }) => {
    const [newName, setNewName] = useState("")
    const [error, setError] = useState("")
    const [editingId, setEditingId] = useState(null)
    const [editingName, setEditingName] = useState("")

    const handleCreate = (e) => {
        e.preventDefault()
        if (!newName.trim()) return

        PositionService.create(
            { name: newName.trim() },
            (list) => {
                setPositions(list)
                setNewName("")
                setError("")
            },
            () => {},
            (err) => setError(err.response?.data?.message ?? "Failed to add position.")
        )
    }

    const startEdit = (row) => {
        setEditingId(row.id)
        setEditingName(row.name)
        setError("")
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditingName("")
    }

    const saveEdit = (row) => {
        if (!editingName.trim()) return

        PositionService.update(
            { id: row.id, name: editingName.trim() },
            (list) => {
                setPositions(list)
                cancelEdit()
            },
            () => {},
            (err) => setError(err.response?.data?.message ?? "Failed to rename position.")
        )
    }

    const handleDelete = (row) => {
        showWarningModal(
            `Are you sure you want to delete "${row.name}"?`,
            "Delete",
            "Cancel",
            () => {
                PositionService.delete(
                    row.id,
                    (list) => setPositions(list),
                    () => {},
                    (err) => setError(err.response?.data?.message ?? "Failed to delete position.")
                )
            }
        )
    }

    return (
        <UpModal
            close={close}
            closeModal={closeModal}
            pd={["px-8", "py-6"]}
            isEnableOuterClose={true}
            bgColor="bg-white"
            w="w-[28rem]"
            cntr={true}
        >
            <div className="w-full grid gap-4">
                <h1 className="text-[1.1em]"><b>Manage Positions</b></h1>

                <form onSubmit={handleCreate} className="flex gap-2">
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="New position name"
                        className="flex-1 border rounded-md px-3 py-2 text-[0.9em] focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <Btn onclick={handleCreate}>Add</Btn>
                </form>

                {error && <div className="text-red-600 text-[0.85em]">{error}</div>}

                <div className="grid gap-2 max-h-[20rem] overflow-y-auto">
                    {positions.map((row) => {
                        const isProtected = PROTECTED_POSITIONS.includes(row.name)

                        return (
                            <div key={row.id} className="flex items-center justify-between gap-2 border rounded-md px-3 py-2">
                                {editingId === row.id ? (
                                    <input
                                        type="text"
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                        className="flex-1 border rounded-md px-2 py-1 text-[0.9em] focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        autoFocus
                                    />
                                ) : (
                                    <span className="text-[0.9em]">{displayName(row.name)}</span>
                                )}

                                <div className="flex gap-1 flex-shrink-0 items-center">
                                    {editingId === row.id ? (
                                        <>
                                            <ActionBtn onClick={() => saveEdit(row)} className="bg-green-600 text-white hover:bg-green-700">
                                                <Check size={14} />
                                            </ActionBtn>
                                            <ActionBtn onClick={cancelEdit} className="bg-gray-400 text-white hover:bg-gray-600">
                                                <X size={14} />
                                            </ActionBtn>
                                        </>
                                    ) : isProtected ? (
                                        <span className="text-gray-400 flex items-center gap-1 text-[0.8em]" title="This position has other access in the system and cannot be renamed or deleted.">
                                            <Lock size={14} />
                                        </span>
                                    ) : (
                                        <>
                                            <ActionBtn onClick={() => startEdit(row)} className="bg-indigo-600 text-white hover:bg-indigo-700">
                                                <Pencil size={14} />
                                            </ActionBtn>
                                            <ActionBtn onClick={() => handleDelete(row)} className="bg-red-600 text-white hover:bg-red-700">
                                                <Trash2 size={14} />
                                            </ActionBtn>
                                        </>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                    {positions.length === 0 && (
                        <div className="text-center text-gray-500 text-[0.85em] py-4">No positions yet.</div>
                    )}
                </div>
            </div>
        </UpModal>
    )
}

export default ManagePositionsModal
