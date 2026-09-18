import { useMemo } from "react";
import { DataGrid } from "@/Components/other/data-grid";
import Box from "@mui/material/Box";
import { getProfilePic, readableDate, readableTime, showUserType, toTitleCase, formatSchoolYearSemester } from "@/others/function";
import ActionBtn from "../button/action-btn";
import ProfilePic from "../other/profile-pic";

const STATUS_STYLES = {
  rejected: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
  ongoing: "bg-orange-100 text-orange-700",
  resolved: "bg-green-100 text-green-700",
  accepted: "bg-green-100 text-green-700",
  approved: "bg-green-100 text-green-700",
  revoked: "bg-gray-200 text-gray-700",
};

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

const statusValueFor = (data) => {
  if (data.type === "complaint") return data.complaint_status;
  if (data.type === "referral") return data.referral_status;
  return null;
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

  link.href = `/download/${type}/${id}`;
  link.setAttribute("download", file);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const ArchiveList = ({ list = [], viewDocument, deleteDocument, recoverDocument }) => {
  const rows = useMemo(
    () => list.map((data, i) => ({ id: `${data.type}-${data.id}`, i: i + 1, data })),
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
          const status = statusValueFor(row.data);
          const person = personFor(row.data);
          return (
            <div className="flex items-center gap-2 h-full py-1">
              {person && (
                <ProfilePic size={2} src={getProfilePic(person.profile?.profile_picture, person.profile?.sex)} />
              )}
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-[0.9em] truncate">{nameFor(row.data)}</span>
                  {status && (
                    <span className={`px-2 py-0.5 rounded-full text-[0.75em] font-medium ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700"}`}>
                      {toTitleCase(status)}
                    </span>
                  )}
                </div>
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
        field: "actions",
        type: "actions",
        headerName: "Action",
        width: 420,
        align: "start",
        headerAlign: "start",
        renderCell: ({ row }) => {
          const data = row.data;
          const t = data.type === "complaint" ? "c" : data.type === "referral" ? "r" : data.type === "absent form" ? "a" : data.type === "gate pass" ? "g" : null;
          const canDelete = data.archived_at ? new Date() >= new Date(data.archived_at) : false;

          return (
            <div className="flex flex-wrap gap-2 items-center py-1">
              {t && (
                <ActionBtn className="bg-blue-600 hover:bg-blue-700" onClick={() => viewDocument(data.id, t)}>
                  View
                </ActionBtn>
              )}

              {data.type === "absent form" && data.confirmed_at === null && (
                <ActionBtn className="bg-green-600 hover:bg-green-700" onClick={() => recoverDocument(data.id, data.type, data.usr)}>
                  Approve
                </ActionBtn>
              )}

              {((data.type === "complaint" && data.complaint_status === "resolved") ||
                (data.type === "absent form" && data.confirmed_at != null) ||
                data.type === "referral") && (
                <ActionBtn className="bg-orange-600 hover:bg-orange-700" onClick={() => downloadDocument(data.type, data.id, data)}>
                  Download
                </ActionBtn>
              )}

              <ActionBtn
                className={canDelete ? "bg-red-600 hover:bg-red-700" : "bg-gray-400 cursor-not-allowed"}
                onClick={() => canDelete && deleteDocument(data.type, data.id)}
                disabled={!canDelete}
                title={canDelete ? "Delete document" : `You can delete this after ${new Date(data.archived_at).toLocaleDateString()}`}
              >
                Delete
              </ActionBtn>
            </div>
          );
        },
      },
    ],
    [viewDocument, recoverDocument, deleteDocument]
  );

  return (
    <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden", backgroundColor: "#fff", borderRadius: 2, boxShadow: 1, p: 2 }}>
      <DataGrid
        rows={rows}
        columns={columns}
        showToolbar
        disableRowSelectionOnClick
        pagination
        initialState={{ pagination: { paginationModel: { page: 0, pageSize: 20 } } }}
        pageSizeOptions={[20, 50, 100, 200]}
        getRowHeight={() => "auto"}
        localeText={{ noRowsLabel: "No Documents Yet" }}
      />
    </Box>
  );
};

export default ArchiveList;
