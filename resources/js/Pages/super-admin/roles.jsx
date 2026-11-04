import { useState } from "react"
import { Head } from "@inertiajs/react"
import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import Btn from "@/Components/button/normal-btn"
import ActionBtn from "@/Components/button/action-btn"
import Switch from "@/Components/button/switch-btn"
import UpModal from "@/Components/modal/up-modal"
import FormTextfield from "@/Components/input/form-input"
import FormButton from "@/Components/button/button"
import { DataGrid } from "@/Components/other/data-grid"
import { Box } from "@mui/material"
import { useReload } from "@/context-provider/reload-provider"
import { RoleService } from "@/others/services/role-service"
import { showOutputModal, showWarningModal } from "@/others/function"
import { Plus } from "lucide-react"

const errorMessage = (x, fallback) =>
    (x.response?.data?.errors && Object.values(x.response.data.errors)[0]?.[0]) ?? x.response?.data?.message ?? fallback

// Add only — a role's name can't be changed once created.
const RoleFormModal = ({ close, closeModal, onSaved, reload }) => {
    const [label, setLabel] = useState("")
    const [err, setErr] = useState("")
    const [wasOpen, setWasOpen] = useState(false)

    if (close !== wasOpen) {
        setWasOpen(close)
        if (close) {
            setLabel("")
            setErr("")
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!label.trim()) {
            setErr("Role name is required.")
            return
        }
        reload(true, "text-wait", "Adding Role")
        const done = (res) => {
            reload(true, "")
            showOutputModal(res.message, "s", () => {
                reload(false)
                onSaved(res.roles)
                closeModal(false)
            })
        }
        const fail = (x) => {
            reload(true, "")
            showOutputModal(errorMessage(x, "Failed to Save Role"), "e", () => reload(false))
        }
        RoleService.create(label.trim(), done, fail)
    }

    return (
        <UpModal close={close} closeModal={closeModal} isEnableOuterClose={true} pd={["px-6", "py-6"]} bgColor="bg-white" w="w-[26rem]">
            <form onSubmit={handleSubmit} className="grid gap-4">
                <h1 className="text-[1.2em] font-bold">Add Role</h1>
                <FormTextfield
                    label="Role Name"
                    name="label"
                    id="role_label"
                    val={label}
                    change={(e) => { setLabel(e.target.value); setErr("") }}
                    error={err}
                />
                <div className="flex justify-end">
                    <FormButton type="submit" label="Add Role" />
                </div>
            </form>
        </UpModal>
    )
}

const Roles = (props) => {
    const [roles, setRoles] = useState(props.roles ?? [])
    const [formOpen, openForm] = useState(false)
    const { loadRegister } = useReload()

    const run = (action, waitText, failText) => {
        loadRegister(true, "text-wait", waitText)
        action(
            (res) => {
                setRoles(res.roles)
                loadRegister(true, "success", res.message)
            },
            (x) => loadRegister(true, "error", errorMessage(x, failText))
        )
    }

    const toggle = (row) => {
        showWarningModal(
            row.is_active
                ? `Deactivate the ${row.label} role? It can no longer be assigned to anyone. Users who already have it keep it.`
                : `Activate the ${row.label} role? It can be assigned to users again.`,
            row.is_active ? "Deactivate" : "Activate",
            "Cancel",
            () => run((s, e) => RoleService.toggle(row.id, s, e), "Updating Role", "Failed to Update Role")
        )
    }

    const remove = (row) => {
        showWarningModal(
            `Delete the ${row.label} role? This cannot be undone.`,
            "Delete Role",
            "Cancel",
            () => run((s, e) => RoleService.remove(row.id, s, e), "Deleting Role", "Failed to Delete Role")
        )
    }

    const columns = [
        {
            field: "label",
            headerName: "Role",
            flex: 1,
            minWidth: 220,
            renderCell: ({ row }) => (
                <span className="text-[0.85em] font-semibold">{row.label}</span>
            ),
        },
        {
            field: "current_users_count",
            headerName: "Users",
            width: 110,
            align: "center",
            headerAlign: "center",
            renderCell: ({ row }) => row.current_users_count,
        },
        {
            field: "is_active",
            headerName: "Status",
            width: 120,
            renderCell: ({ row }) => (
                <span className={`font-semibold text-[0.85em] ${row.is_active ? "text-green-600" : "text-gray-500"}`}>
                    {row.is_active ? "Active" : "Inactive"}
                </span>
            ),
        },
        {
            field: "actions",
            type: "actions",
            headerName: "Action",
            width: 180,
            align: "left",
            headerAlign: "left",
            renderCell: ({ row }) => {
                const linked = row.linked_count > 0
                return (
                    <div className="flex gap-2 items-center h-full">
                        <Switch
                            checked={!!row.is_active}
                            onChange={() => toggle(row)}
                            effect={["bg-red-600", "bg-green-600"]}
                        />
                        {!row.is_system && !linked && (
                            <ActionBtn onClick={() => remove(row)} className="bg-red-600 text-white hover:bg-red-700">
                                Delete
                            </ActionBtn>
                        )}
                    </div>
                )
            },
        },
    ]

    return (
        <>
            <Head title="Roles" />
            <RoleFormModal
                close={formOpen}
                closeModal={openForm}
                onSaved={setRoles}
                reload={loadRegister}
            />
            <PageLayout
                title="Role Management"
                rightSideComponent={<Btn onclick={() => openForm(true)} icon={<Plus size={20} />}>Add Role</Btn>}
            >
                <p className="text-[0.8em] text-gray-600 -mt-2">
                    A role that any user has had can only be activated or deactivated. A role with no linked users can be deleted.
                </p>
                <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm min-w-0">
                    <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden", px: 2.5, py: 1.5 }}>
                        <DataGrid
                            rows={roles}
                            getRowId={(row) => row.id}
                            columns={columns}
                            disableRowSelectionOnClick
                            hideFooter
                            getRowHeight={() => "auto"}
                            localeText={{ noRowsLabel: "No roles yet" }}
                        />
                    </Box>
                </div>
            </PageLayout>
        </>
    )
}

Roles.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default Roles
