import { useMemo } from "react";
import { DataGrid } from "@/Components/other/data-grid";
import Box from "@mui/material/Box";
import { getProfilePic, readableDate, readableTime, showUserType, toTitleCase, formatSchoolYearSemester } from "@/others/function";
import ActionBtn from "../button/action-btn";
import ProfilePic from "../other/profile-pic";
import StatusPill from "@/Components/list/status-pill";
import { StatusAvatar, statusLabel } from "@/Components/other/mobile-card-list";
import { Archive } from "lucide-react";

const referenceNumberFor = (data) => {
  if (data.type === "complaint") return data.complaint_number;
  if (data.type === "referral") return data.referral_number;
  if (data.type === "absent form") return data.form_number;
  if (data.type === "gate pass") return data.gatepass_number;
  return data.id;
};

const personFor = (data) => {
  if (data.type === "complaint" || data.type === "referral") return data.usr;
  return data.student;
};

const nameFor = (data) => {
  const person = personFor(data);
  if (!person) {
    return toTitleCase(data.complainant_name || "N/A");
  }
  return toTitleCase(`${person.profile?.first_name ?? ""} ${person.profile?.last_name ?? ""}`.trim()) || "-";
};

// Absent forms and gate passes have no status field: it follows from which
// of their decision dates is set.
const statusValueFor = (data) => {
  if (data.type === "complaint") return data.complaint_status;
  if (data.type === "referral") return data.referral_status;
  if (data.revoked_at) return "revoked";
  if (data.rejected_at) return "rejected";
  if (data.confirmed_at) return "approved";
  return "pending";
};

// Whichever status a record last transitioned into is the semester tag we
// want to show — falls back to the filing-time tag for still-pending rows.
const semesterValueFor = (data) => {
  if (data.revoked_at && data.revoked_school_year_semester) return data.revoked_school_year_semester;
  if (data.rejected_at && data.rejected_school_year_semester) return data.rejected_school_year_semester;
  if (data.type === "complaint" && data.complaint_status === "resolved" && data.resolved_school_year_semester) return data.resolved_school_year_semester;
  if (data.confirmed_at && data.confirmed_school_year_semester) return data.confirmed_school_year_semester;
  return data.school_year_semester;
};

const downloadDocument = (type, id, data) => {
  const link = document.createElement("a");
  let file = "";
  if (type === "complaint") file = `complaint-files-${data.complaint_number}.zip`;
  if (type === "referral") file = `referral-files-${data.referral_number}.zip`;
  if (type === "absent form") file = `absence-files-${data.form_number}.zip`;

  link.href = `/download/${type}/${data.encrypted_id}`;
  link.setAttribute("download", file);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// showType: the Type column, only useful when the list mixes types (the All tab).
// Records are deleted automatically on their Kept Until date (archived_at;
// see PurgeExpiredArchiveCommand), so there's no Delete action.
const ArchiveList = ({ list = [], viewDocument, showType = true }) => {
  const rows = useMemo(
    // null while the list loads.
    () => (list ?? []).map((data, i) => ({ id: `${data.type}-${data.id}`, i: i + 1, data })),
    [list]
  );

  const columns = useMemo(
    () => [
      { field: "i", headerName: "#", width: 50 },
      {
        field: "type",
        headerName: "Type",
        width: 130,
        valueGetter: (v, row) => toTitleCase(row.data.type),
      },
      {
        field: "reference",
        headerName: "Reference No.",
        width: 140,
        valueGetter: (v, row) => referenceNumberFor(row.data),
      },
      {
        field: "name",
        headerName: "Name",
        flex: 1.3,
        minWidth: 240,
        renderCell: ({ row }) => {
          const person = personFor(row.data);
          return (
            <div className="flex items-center gap-2 h-full py-1">
              {person && (
                <ProfilePic size={2} src={getProfilePic(person.profile?.profile_picture, person.profile?.sex)} />
              )}
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-[0.9em] truncate">{nameFor(row.data)}</span>
                {person && (
                  <span className="text-[0.75em] text-gray-500 truncate">{showUserType(person, true)}</span>
                )}
                {formatSchoolYearSemester(semesterValueFor(row.data)) && (
                  <span className="text-[0.75em] text-gray-500 truncate">{formatSchoolYearSemester(semesterValueFor(row.data))}</span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        field: "status",
        headerName: "Status",
        width: 120,
        valueGetter: (_, row) => statusValueFor(row.data),
        renderCell: ({ row }) => (
          <div className="h-full flex items-center">
            <StatusPill status={statusValueFor(row.data)} />
          </div>
        ),
      },
      {
        field: "created_at",
        headerName: "Sent Since",
        width: 190,
        renderCell: ({ row }) => (
          <span className="text-[0.85em]">
            {readableDate(row.data.created_at)} ({readableTime(row.data.created_at)})
          </span>
        ),
      },
      {
        field: "archived_at",
        headerName: "Kept Until",
        width: 150,
        renderCell: ({ row }) => (
          <span className="text-[0.85em]" title="Deleted automatically on this date">
            {row.data.archived_at ? readableDate(row.data.archived_at) : "-"}
          </span>
        ),
      },
      {
        field: "actions",
        type: "actions",
        headerName: "Action",
        width: 200,
        align: "left",
        headerAlign: "left",
        renderCell: ({ row }) => {
          const data = row.data;
          const t = data.type === "complaint" ? "c" : data.type === "referral" ? "r" : data.type === "absent form" ? "a" : data.type === "gate pass" ? "g" : null;

          return (
            <div className="flex flex-wrap gap-2 items-center py-1">
              {t && (
                <ActionBtn className="bg-blue-600 hover:bg-blue-700" onClick={() => viewDocument(data.encrypted_id, t)}>
                  View
                </ActionBtn>
              )}

              {/* Any status: a record with no saved PDF (e.g. rejected)
                  gets its PDF built into the ZIP. Gate passes have none. */}
              {["complaint", "referral", "absent form"].includes(data.type) && (
                <ActionBtn className="bg-orange-600 hover:bg-orange-700" onClick={() => downloadDocument(data.type, data.id, data)}>
                  Download
                </ActionBtn>
              )}
            </div>
          );
        },
      },
    ].filter((c) => showType || c.field !== "type"),
    [viewDocument, showType]
  );

  return (
    <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
      <DataGrid
        rows={rows}
        loading={list == null}
        columns={columns}
        showToolbar
        disableRowSelectionOnClick
        pagination
        initialState={{ pagination: { paginationModel: { page: 0, pageSize: 20 } } }}
        pageSizeOptions={[20, 50, 100]}
        getRowHeight={() => "auto"}
        localeText={{ noRowsLabel: "No Documents Yet" }}
        // Phones: one row per document (the person's photo and name, then
        // type, reference no. and status); tap for the details and actions.
        mobileSummary={({ data }) => {
          const person = personFor(data);
          return {
            name: nameFor(data),
            role: `${toTitleCase(data.type)} #${referenceNumberFor(data)} · ${statusLabel(statusValueFor(data))}`,
            ...(person
              ? { picture: person.profile?.profile_picture, sex: person.profile?.sex }
              : { avatar: <StatusAvatar icon={Archive} status={statusValueFor(data)} /> }),
            hide: ["name", "type", "reference", "status"],
          };
        }}
      />
    </Box>
  );
};

export default ArchiveList;
