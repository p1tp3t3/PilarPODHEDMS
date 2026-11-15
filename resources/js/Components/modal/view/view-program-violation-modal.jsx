import UpModal from "../up-modal"
import { Fragment, useState, useEffect } from "react"
import { ReportArchiveService } from "@/others/services/report-archive-service"
import { UserX } from "lucide-react"
import { getProfilePic, showUserType, readableDate, toTitleCase } from "@/others/function"
import { router } from "@inertiajs/react"
import { ModalHeader, ViewModalSkeleton } from "./view-modal-parts"
import StatusPill from "@/Components/list/status-pill"
import {
  Avatar, Box, Button, Chip, Collapse, Divider, List, ListItem, ListItemAvatar,
  ListItemButton, ListItemText, Paper, Typography,
} from "@mui/material"
import { ExpandMoreRounded, OpenInNewRounded } from "@mui/icons-material"

// "Violations per Program" drill-down (Analytical Report): the program's
// students with violations, most first; each opens to its violations.
const fullName = (u) => [u?.profile?.first_name, u?.profile?.middle_name, u?.profile?.last_name].filter(Boolean).join(" ")

const ViewProgramViolationModal = (props) => {
  const [data, setData] = useState(null)
  const [openIdx, setOpenIdx] = useState(0)

  useEffect(() => {
    if (props.close && props.program) {
      setData(null)
      setOpenIdx(0)
      ReportArchiveService.getProgramViolationDetail(
        {
          program: props.program,
          date_from: props.dateFrom || "",
          date_to: props.dateTo || "",
        },
        setData
      )
    }
  }, [props.close, props.program, props.dateFrom, props.dateTo])

  return (
    <UpModal
      close={props.close}
      closeModal={props.closeModal}
      isEnableOuterClose={props.isEnableOuterClose}
      pd={["p-0", ""]}
      bgColor="bg-white"
      w="w-[40rem] max-w-[92vw]"
    >
      <div className="w-full">
        {data ? (
          <>
            <ModalHeader title={`${props.program} Violations`} />

            <div className="p-4 sm:p-6 space-y-4">
              {data.students.length ? (
                <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
                  <List disablePadding sx={{ maxHeight: "26rem", overflowY: "auto" }}>
                    {data.students.map((row, i) => {
                      const open = openIdx === i
                      return (
                        <Fragment key={i}>
                          {i > 0 && <Divider component="li" />}
                          <ListItem disablePadding sx={{ display: "block" }}>
                            <ListItemButton onClick={() => setOpenIdx(open ? null : i)} selected={open} sx={{ py: 1.25 }}>
                              <Typography sx={{ width: 24, fontWeight: 700, color: "primary.main", fontSize: "0.9rem" }}>{i + 1}</Typography>
                              <ListItemAvatar sx={{ minWidth: 48 }}>
                                <Avatar src={getProfilePic(row.user?.profile?.profile_picture, row.user?.profile?.sex)} sx={{ width: 36, height: 36 }} />
                              </ListItemAvatar>
                              <ListItemText
                                primary={fullName(row.user) || "Unknown"}
                                secondary={row.user ? showUserType(row.user) : null}
                                slotProps={{ primary: { noWrap: true, fontWeight: 600, fontSize: "0.9rem" }, secondary: { noWrap: true, fontSize: "0.75rem" } }}
                              />
                              <Chip
                                size="small"
                                color="error"
                                variant="outlined"
                                label={`${row.total_violations} violation${row.total_violations !== 1 ? "s" : ""}`}
                                sx={{ mx: 1, flexShrink: 0 }}
                              />
                              <ExpandMoreRounded sx={{ color: "text.secondary", transition: "transform .2s", transform: open ? "rotate(180deg)" : "none" }} />
                            </ListItemButton>

                            <Collapse in={open} timeout="auto" unmountOnExit>
                              <Box sx={{ px: 2, pb: 1.5, pt: 0.5, bgcolor: "action.hover" }}>
                                <List dense disablePadding>
                                  {row.violations.map((v, j) => (
                                    <ListItem key={j} disableGutters sx={{ py: 0.75, gap: 1.5, borderBottom: j < row.violations.length - 1 ? 1 : 0, borderColor: "divider" }}>
                                      <Box sx={{ flexShrink: 0, fontSize: "0.72rem", width: 52 }}>
                                        <StatusPill status={String(v.offense_status) === "1" ? "major" : "minor"} />
                                      </Box>
                                      <ListItemText
                                        primary={toTitleCase(v.violation_name || "Unknown")}
                                        secondary={[v.case_number && `Case #${v.case_number}`, v.offense_issued_at && readableDate(v.offense_issued_at)].filter(Boolean).join(" · ")}
                                        slotProps={{ primary: { fontSize: "0.85rem", fontWeight: 500 }, secondary: { fontSize: "0.72rem" } }}
                                      />
                                    </ListItem>
                                  ))}
                                </List>
                                {row.user?.encrypted_id && (
                                  <Box sx={{ display: "flex", justifyContent: "flex-end", pt: 1 }}>
                                    <Button
                                      size="small"
                                      endIcon={<OpenInNewRounded fontSize="small" />}
                                      onClick={() => router.visit(`/student-violation/${row.user.encrypted_id}`)}
                                      sx={{ textTransform: "none", fontWeight: 600 }}
                                    >
                                      Open profile
                                    </Button>
                                  </Box>
                                )}
                              </Box>
                            </Collapse>
                          </ListItem>
                        </Fragment>
                      )
                    })}
                  </List>
                </Paper>
              ) : (
                <div className="py-10 grid place-items-center gap-2 text-gray-400">
                  <UserX size={28} />
                  <p className="text-[0.9em]">No students with violations in this period</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-6"><ViewModalSkeleton variant="list" /></div>
        )}
      </div>
    </UpModal>
  )
}

export default ViewProgramViolationModal
