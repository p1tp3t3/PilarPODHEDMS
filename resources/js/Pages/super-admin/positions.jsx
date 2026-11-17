import { useState } from "react"
import { Head } from "@inertiajs/react"
import { Box, Chip, Tooltip } from "@mui/material"
import { Plus, Lock } from "lucide-react"
import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import Btn from "@/Components/button/normal-btn"
import ActionBtn from "@/Components/button/action-btn"
import UpModal from "@/Components/modal/up-modal"
import FormTextfield from "@/Components/input/form-input"
import FormButton from "@/Components/button/button"
import { DataGrid } from "@/Components/other/data-grid"
import { useReload } from "@/context-provider/reload-provider"
import { PositionService } from "@/others/services/position-service"
import { readableDate, showOutputModal, showWarningModal } from "@/others/function"
import useListData, { reloadListData } from "@/others/hooks/use-list-data"
import { Validator } from "@/others/classes/validator"

const errorMessage = (x, fallback) =>
    (x.response?.data?.errors && Object.values(x.response.data.errors)[0]?.[0]) ?? x.response?.data?.message ?? fallback

// Add a position.
const PositionFormModal = ({ close, closeModal, positions, reload }) => {
    const [name, setName] = useState("")
    const [err, setErr] = useState("")
    const [wasOpen, setWasOpen] = useState(false)

    if (close !== wasOpen) {
        setWasOpen(close)
        if (close) {
            setName("")
            setErr("")
        }
    }

    const validate = (value) => Validator.positionName(value, positions)

    const handleSubmit = (e) => {
        e.preventDefault()
        const msg = validate(name)
        setErr(msg)
        if (msg) return

        reload(true, "text-wait", "Adding Position")
        const done = () => {
            reload(true, "")
            showOutputModal("Position Added Successfully", "s", () => {
                reload(false)
                closeModal(false)
                reloadListData()
            })
        }
        const fail = (x) => {
            reload(true, "")
            showOutputModal(errorMessage(x, "Failed to Add Position"), "e", () => reload(false))
        }
        PositionService.create({ name: name.trim() }, () => {}, done, fail)
    }

    return (
        <UpModal close={close} closeModal={closeModal} isEnableOuterClose={true} pd={["px-6", "py-6"]} bgColor="bg-white" w="w-[26rem]">
            <form onSubmit={handleSubmit} className="grid gap-4">
                <h1 className="text-[1.2em] font-bold">Add Position</h1>
                <FormTextfield
                    label="Position Name"
                    name="name"
                    id="position_name"
                    val={name}
                    change={(e) => { setName(e.target.value); setErr("") }}
                    error={err}
                />
                <div className="flex justify-end">
                    <FormButton type="submit" label="Add Position" />
                </div>
            </form>
        </UpModal>
    )
}

// Staff Positions (super admin): the list of non-teaching-staff positions.
// The table loads from /api/super-admin/positions once the page opens.
const Positions = () => {
    const { data: lists } = useListData()
    const positions = lists?.positions ?? null
    const [formOpen, openForm] = useState(false)
    const { loadRegister } = useReload()

    const remove = (row) => {
        showWarningModal(`Are you sure you want to delete "${row.name}"?`, "Delete", "Cancel", () => {
            loadRegister(true, "text-wait", "Deleting Position")
            PositionService.delete(
                row.id,
                () => {},
                () => {
                    loadRegister(true, "")
                    showOutputModal("Position Deleted Successfully", "s", () => { loadRegister(false); reloadListData() })
                },
                (x) => {
                    loadRegister(true, "")
                    showOutputModal(errorMessage(x, "Failed to Delete Position"), "e", () => loadRegister(false))
                }
            )
        })
    }

    const columns = [
        {
            field: "name",
            headerName: "Position",
            flex: 1,
            minWidth: 200,
            renderCell: ({ row }) => (
                <div className="flex items-center gap-2 h-full">
                    <span>{row.name}</span>
                    {row.protected && (
                        <Tooltip title="Used by the system (gate pass verification, referrals), so it can't be deleted." arrow>
                            <Chip size="small" icon={<Lock size={12} />} label="System" variant="outlined" sx={{ height: 22, fontSize: "0.72rem" }} />
                        </Tooltip>
                    )}
                </div>
            ),
        },
        {
            field: "staff_count",
            headerName: "Assigned Staff",
            width: 150,
            align: "center",
            headerAlign: "center",
        },
        {
            field: "created_at",
            headerName: "Added On",
            width: 160,
            valueGetter: (value) => (value ? readableDate(value) : "—"),
        },
        {
            field: "actions",
            type: "actions",
            headerName: "Action",
            width: 140,
            align: "left",
            headerAlign: "left",
            renderCell: ({ row }) => {
                // Not for a position the system uses, or one staff still hold.
                const deleteReason = row.protected
                    ? "Used by the system: it can't be deleted."
                    : row.staff_count > 0 ? "Staff are still assigned to this position." : null
                return (
                    <div className="flex items-center h-full">
                        <Tooltip title={deleteReason ?? ""} arrow>
                            <span>
                                <ActionBtn onClick={() => remove(row)} disabled={!!deleteReason} className="bg-red-600 text-white hover:bg-red-700">
                                    Delete
                                </ActionBtn>
                            </span>
                        </Tooltip>
                    </div>
                )
            },
        },
    ]

    return (
        <>
            <Head title="Staff Positions" />
            <PositionFormModal close={formOpen} closeModal={openForm} positions={positions} reload={loadRegister} />
            <PageLayout
                title="Staff Positions"
                rightSideComponent={<Btn onclick={() => openForm(true)} icon={<Plus size={20} />}>Add Position</Btn>}
            >
                <div className="w-full min-w-0">
                    <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
                        <DataGrid
                            rows={positions ?? []}
                            loading={positions == null}
                            getRowId={(row) => row.id}
                            columns={columns}
                            disableRowSelectionOnClick
                            showToolbar
                            pagination
                            pageSizeOptions={[10, 20, 50]}
                            initialState={{ pagination: { paginationModel: { page: 0, pageSize: 20 } } }}
                            localeText={{ noRowsLabel: "No positions yet" }}
                            mobileSummary={(row) => ({
                                name: row.name,
                                role: `${row.staff_count} assigned${row.protected ? " · System" : ""}`,
                                hide: ["name"],
                            })}
                        />
                    </Box>
                </div>
            </PageLayout>
        </>
    )
}

Positions.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default Positions
