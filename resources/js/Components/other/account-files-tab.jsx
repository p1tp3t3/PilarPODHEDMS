import { useState } from "react";
import { AccountService } from "@/others/services/account-service";
import UserAccountFileList from "@/Components/list/user-account-file-list";
import DropdownField from "@/Components/input/dropdown";

export const accountFileRole = (name = "") => {
    const n = name.toLowerCase();
    if (n.startsWith("student-")) return "student";
    if (n.startsWith("faculty-")) return "faculty";
    if (n.startsWith("staff-")) return "non_teaching_staff";
    if (n.startsWith("parent-")) return "parent";
    return "other";
};

const ROLE_OPTIONS = [
    { val: "student", label: "Student" },
    { val: "faculty", label: "Faculty" },
    { val: "non_teaching_staff", label: "Non-Teaching Staff" },
];

/**
 * Lists the generated default-account CSV/ZIP files (id + default password
 * per user). Scoped server-side: super_admin/sub_admin see every file,
 * program heads see only their own program's student/faculty files.
 *
 * `files` comes down as an Inertia prop from the page itself (same as the
 * Users tab's account list) — this component never fetches the listing on
 * its own.
 */
const AccountFilesTab = ({ files = [], canDelete = false, showRoleFilter = true }) => {
    const [data, setData] = useState(files);
    const [role, setRole] = useState("all");

    const deleteFile = (f) => {
        AccountService.deleteAccountFile(f, setData);
    };

    const shown = role === "all" ? data : (data ?? []).filter((f) => accountFileRole(f.name) === role);

    return (
        <div className="grid gap-3 min-w-0">
            {showRoleFilter && <div className="flex justify-end">
                <div className="w-full sm:w-60">
                    <DropdownField
                        default={{ val: "all", label: "All Roles" }}
                        list={ROLE_OPTIONS}
                        val={role}
                        onChange={(e) => setRole(e.target.value)}
                        name="account_file_role"
                        keepCase={true}
                    />
                </div>
            </div>}
            <UserAccountFileList list={shown} deleteFile={canDelete ? deleteFile : undefined} />
        </div>
    );
};

export default AccountFilesTab;
