import AuthLayout from "@/Layouts/auth-layout";
import PageLayout from "@/Layouts/page-layout";
import { useEffect, useState } from "react";
import { router } from "@inertiajs/react";
import AccountList from "@/Components/list/account-list";
import AccountFilesTab from "@/Components/other/account-files-tab";
import TabSwitcher from "@/Components/other/tab-switcher";
import DropdownField from "@/Components/input/dropdown";
import EditUserInfoModal from "@/Components/modal/submission-form/edit-user-information-modal";
import { useReload } from "@/context-provider/reload-provider";
import { AccountService } from "@/others/services/account-service";
import { showOutputModal, showWarningModal } from "@/others/function";

const roleOptions = [
  { val: "super_admin", label: "Super Admin" },
  { val: "sub_admin", label: "Sub Admin" },
  { val: "student", label: "Student" },
  { val: "teaching_staff", label: "Teaching Staff" },
  { val: "non_teaching_staff", label: "Non-Teaching Staff" },
  { val: "parent", label: "Parent" },
];

const Accounts = (props) => {
  const [editUserInfo, openEditUserInfo] = useState(false),
    [data, setData] = useState(null),
    [profile, setProfile] = useState(""),
    [deleteUser, openDeleteUser] = useState(false),
    [clickedOk, setClickOk] = useState(false);

  const { loadRegister, setReload, setOnClose } = useReload();

  useEffect(() => {
    setOnClose(() => (e) => {
      setReload(e);
      if (clickedOk) window.location.reload();
      setClickOk(false);
    });
  }, [clickedOk]);

  const url = new URLSearchParams(window.location.search);
  const activeTab = url.get("tab") || "users";
  const roleFilter = url.get("role") || "all";

  // Preserves every other active query param (tab, role) when only one of
  // them changes, instead of rebuilding the query string from scratch.
  const updateQuery = (patch) => {
    const params = new URLSearchParams(window.location.search);
    Object.entries(patch).forEach(([key, value]) => {
      if (value && value !== "all") params.set(key, value);
      else params.delete(key);
    });
    router.visit(`/super-admin/user-accounts?${params.toString()}`);
  };

  const goToTab = (tab) => updateQuery({ tab });
  const handleRoleChange = (e) => updateQuery({ role: e.target.value });

  const showEditUserInfo = (data) => {
    openEditUserInfo(true);
    setData(data);
  };

  const openDeleteUserAccount = (data) => {
    const userId = data.id_number
    showWarningModal(
      `Are You Sure You Want To Delete Account ${userId}?`,
      'Delete Account',
      'Cancel',
      () => {
        const d = { user_id: data.id, user_type: data.role };

        loadRegister(true, "text-wait", "Deleting Account Is Processing");
        AccountService.deleteAccount(
          d,
          () => {
            loadRegister(true, "");
            showOutputModal(
              `Account ${userId} Deleted Successfully`,
              's',
              () => {
                loadRegister(false)
                window.location.reload()
              }
            )
          },
          (err) => {
            loadRegister(true, "");
            showOutputModal(
              err.response.data.message,
              'e',
              () => loadRegister(false)
            )
          }
        );
      }
    )
  };

  const buttonStyle =
    "px-4 h-[2rem] rounded-md bg-blue-700 text-white text-[0.8em] hover:bg-blue-900";

  return (
    <>
      <EditUserInfoModal
        close={editUserInfo}
        closeModal={openEditUserInfo}
        pd={["px-5", "py-7"]}
        isEnableOuterClose={true}
        data={data}
        profilePic={profile}
        reload={loadRegister}
      />

      <PageLayout title="USER LIST">
        {/* Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <TabSwitcher
            tabs={[
              { key: "users", label: "Users" },
              { key: "files", label: "Account Files" },
            ]}
            value={activeTab}
            onChange={goToTab}
          />
          {activeTab === "users" && (
            <div className="w-full sm:w-56 flex-shrink-0">
              <DropdownField
                default={{ val: "all", label: "All Roles" }}
                list={roleOptions}
                val={roleFilter}
                onChange={handleRoleChange}
                name="role_filter"
              />
            </div>
          )}
        </div>

        {activeTab === "users" && (
          <div>
            <AccountList
              row={props.account_list}
              openEditUserInfo={showEditUserInfo}
              deleteUser={openDeleteUserAccount}
              program={props.program}
              reload={loadRegister}
            />
          </div>
        )}

        {activeTab === "files" && (
          <div>
            <AccountFilesTab files={props.account_files} canDelete={true} />
          </div>
        )}
      </PageLayout>
    </>
  );
};

Accounts.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default Accounts;
