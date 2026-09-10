import React, { useEffect, useMemo, useState, useContext } from "react";
import { Box } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import ProfilePic from "../other/profile-pic";
import {
  checkActiveStatus,
  getProfilePic,
  getYearLevel,
  readableActiveDuration,
  readableDate,
  readableTime,
} from "../../others/function";
import { Link } from "@inertiajs/react";
import ActionBtn from "../button/action-btn";
import AuthContext from "@/context-provider/auth-provider";

const StudentList = ({ list = null, style = true, type = "prefect", paginate = true, canEditEnrollment = false, onEditEnrollment = () => {} }) => {
  const data = paginate ? list?.data || [] : list || [];

  const rows = useMemo(() => {
  return data.map((obj, i) => {
    const t = (type === "prefect" || type == 'itrc') || type === "program_head";
    const user = t ? obj : obj.user;
    const latestEnrollment = user.enrollments?.[user.enrollments.length - 1];

    const fullName = `${user.profile?.first_name || ""} ${user.profile?.middle_name || ""} ${user.profile?.last_name || ""}`;
    const programName = user.program?.name || "";
    const program = [programName, latestEnrollment?.year_level ? getYearLevel(latestEnrollment.year_level) : null]
      .filter(Boolean)
      .join(" • ");
    const schoolYear = latestEnrollment?.school_year?.year || "N / A";

    return {
      id: i,
      index: i,
      user_id: user.id_number,
      username: user.username,
      full_name: fullName,

      // 🔥 FLATTENED SEARCH FIELD
      studentSearch: `${fullName} ${program} ${schoolYear}`.toLowerCase(),

      // 👇 Raw data for rendering
      fullName,
      program,
      profile_picture: user.profile?.profile_picture,
      sex: user.profile?.sex,
      color: user.program?.color_code,
      school_year: schoolYear,
      created_at: user.created_at,
      last_seen: user.last_seen,
      raw: user,
    };
  });
}, [data, type]);


  const columns = [
    {
      field: "index",
      headerName: "#",
      width: 60,
      renderCell: (params) => params.value + 1,
    },
    {
      field: "user_id",
      headerName: "Student ID",
      width: 130,
    },
    {
      field: "full_name",
      headerName: "Student",
      flex: 1,
      minWidth: 260,
      renderCell: (params) => <StudentCell row={params.row} />,
      sortable: true,
      filterable: true,
    },
    {
      field: "school_year",
      headerName: "School Year",
      width: 130,
      renderCell: (params) => params.value ?? "N/A",
    },
    {
      field: "created_at",
      headerName: "Registered Since",
      width: 170,
      renderCell: (params) => (
        <div>
          <div className="text-[0.8rem]">{readableDate(params.value)}</div>
          <div className="text-[0.7rem]">{readableTime(params.value)}</div>
        </div>
      ),
    },
    {
      field: "last_seen",
      headerName: "Active Since",
      width: 150,
      renderCell: (params) => (
        <ActiveStatusCell lastSeen={params.value} />
      ),
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Action",
      width: canEditEnrollment ? 300 : 180,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <div className="flex gap-2 items-center h-full">
          <Link href={`/profile/${params.row.username}`}>
            <ActionBtn className="bg-blue-600 text-white hover:bg-blue-700">
              View
            </ActionBtn>
          </Link>
          {canEditEnrollment && (
            <ActionBtn
              className="bg-indigo-600 text-white hover:bg-indigo-700"
              onClick={() => onEditEnrollment(params.row.raw)}
            >
              Edit Enrollment
            </ActionBtn>
          )}
        </div>
      ),
    },
  ];

  return (
    <Box
      className={
        style
          ? "w-full px-5 py-3 bg-white rounded-md shadow-black/20 shadow-sm overflow-x-auto"
          : "overflow-x-auto"
      }
      sx={{ width: "100%" }}
    >
      <Box sx={{ minWidth: "1000px" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          disableRowSelectionOnClick
          hideFooterSelectedRowCount
          pagination
          pageSizeOptions={[20, 50, 100, 200]}
          initialState={{ pagination: { paginationModel: { page: 0, pageSize: 20 } } }}
          showToolbar
          getRowId={(row) => row.id}
        />
      </Box>
    </Box>
  );
};

/* ======================= */
/* Reusable Cell Components */
/* ======================= */

const StudentCell = ({ row }) => {
  const { isUserOnline } = useContext(AuthContext);
  const [lastSeenText, setLastSeenText] = useState(
    readableActiveDuration(row.last_seen)
  );
  const [isActive, setIsActive] = useState(
    checkActiveStatus(row.last_seen)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setLastSeenText(readableActiveDuration(row.last_seen));
      setIsActive(checkActiveStatus(row.last_seen));
    }, 5000);

    return () => clearInterval(interval);
  }, [row.last_seen]);

  return (
    <div className="flex items-center gap-3 h-full">
      <ProfilePic
        size={1.9}
        src={getProfilePic(row.profile_picture, row.sex)}
        showActive
        isActive={isUserOnline(row.id) || isActive}
        activeSize={0.9}
        border={{ size: 2.1, color: row.color }}
      />
      <div className="flex flex-col justify-center leading-tight">
        <h1 className="text-[0.8rem] font-bold">{row.fullName}</h1>
        <p className="text-[0.7rem]">{row.program}</p>
      </div>
    </div>
  );
};

const ActiveStatusCell = ({ lastSeen }) => {
  const [text, setText] = useState(readableActiveDuration(lastSeen));

  useEffect(() => {
    const interval = setInterval(() => {
      setText(readableActiveDuration(lastSeen));
    }, 5000);

    return () => clearInterval(interval);
  }, [lastSeen]);

  return <span className="text-[0.8rem]">{lastSeen ? text : "N/A"}</span>;
};

export default StudentList;
