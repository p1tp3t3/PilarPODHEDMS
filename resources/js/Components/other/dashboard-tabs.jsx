import { useState } from "react";
import { usePage } from "@inertiajs/react";
import TabSwitcher from "@/Components/other/tab-switcher";
import OffenseList from "@/Components/list/offense-list";
import PenaltyList from "@/Components/list/penalty-list";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "offense", label: "List of Violations" },
  { key: "penalty", label: "List of Penalties" },
];

// Overview (the dashboard's own content) + the school's violation and
// penalty lists, as on the student dashboard.
const DashboardTabs = ({ children }) => {
  const [choose, setChoose] = useState("overview");
  // Both lists come with the page (DashboardController::violationLists).
  const { offense_list, penalty_list } = usePage().props;

  return (
    <>
      <div className="mb-4">
        <TabSwitcher tabs={TABS} value={choose} onChange={setChoose} />
      </div>

      {choose === "overview" && children}
      {choose === "offense" && <OffenseList list={offense_list} />}
      {choose === "penalty" && <PenaltyList list={penalty_list} />}
    </>
  );
};

export default DashboardTabs;
