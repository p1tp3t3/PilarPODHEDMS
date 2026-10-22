import ProfilePic from "../other/profile-pic"
import { getProfilePic } from "@/others/function"
import SidebarNav from "./sidebar-nav"
import { getSidebarPages } from "./sidebar-pages"
import "@/Responsive/sidebar-responsive.css"
import { Link, usePage } from "@inertiajs/react"
import { IconButton } from "@mui/material"
import bg from "@/images/bg-pilar.jpg"
import { ArrowLeft } from "lucide-react"
import { closeSidebarDrawer } from "./sidebar-drawer"

const AuthSideBar = ({ usr }) => {
  // Reliably eager-loaded regardless of which page's controller built
  // `usr` — see HandleInertiaRequests — used for the picture/name/role-label
  // below, and merged into what's passed to getSidebarPages() so its
  // position-based show() checks (program_head/faculty, guard/guidance)
  // work consistently no matter which page happens to be open, instead of
  // depending on that page's own controller having loaded the relation.
  const { auth } = usePage().props
  const identity = auth?.user ?? usr

  const roleLabel = () => {
    switch (usr.role) {
      case "super_admin":
        return "IT Admin"
      case "sub_admin":
        return "Prefect"
      case "student":
        return "Student"
      case "teaching_staff":
        return identity.teaching_staff?.position === "program_head" ? "Program Head" : "Faculty"
      case "non_teaching_staff":
        return identity.non_teaching_staff?.position || "Staff"
      case "guard":
        return "Guard"
      case "guidance":
        return "Guidance"
      case "parent":
        return "Parent"
    }
  }

  return (
    <>
    {/* Tablet/desktop: a narrow icon rail that reserves only 5rem in the
        layout; hovering it widens the panel inside to the full menu,
        floating over the page (so the content never shifts). Phones: the
        full-width off-canvas drawer, as before. */}
    <aside
      className={`
        sidebar-rail flex-shrink-0 flex-grow-0
        w-[19rem] md:w-[5rem] transition-all h-screen bg-gray-950 sticky top-0 z-[60]
        max-[767px]:fixed max-[767px]:top-0 max-[767px]:left-0 max-[767px]:w-0 max-[767px]:z-[100]
        max-[767px]:max-w-[85vw] max-[767px]:h-[100dvh] max-[767px]:shadow-2xl
      `}
    >
      <div className="w-full h-full grid grid-cols-[minmax(0,1fr)] content-start gap-5 overflow-hidden bg-gray-950 md:absolute md:inset-y-0 md:left-0 md:w-[5rem] md:hover:w-[19rem] md:transition-[width] md:duration-200 md:ease-out md:hover:shadow-2xl md:hover:shadow-black/40">
        {/* Header Section */}
        <div>
          <div
            className="rail-header flex text-white items-center gap-3 px-5 py-2 min-h-[3.5rem] bg-no-repeat bg-center bg-cover relative"
            style={{ backgroundImage: `url(${bg})` }}
          >
            {/* dark overlay */}
            <div className="bg-black/70 absolute w-full h-full left-0 top-0"></div>

            {/* profile */}
            <div className="z-10">
              <ProfilePic src={"/default-pic/pilar.png"} size={2.5} />
            </div>

            {/* text */}
            <div className="rail-hide w-full z-10 whitespace-nowrap">
              <h1 className="text-[1em] font-bold">PilarPODHEDMS</h1>
              <h1 className="text-[0.7em]">Pilar College of Zamboanga City, Inc.</h1>
            </div>

            {/* arrow button — visible only on phone-sized screens, not tablet/desktop */}
            <IconButton
              onClick={closeSidebarDrawer}
              sx={{
                position: "absolute",
                right: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 20,
                color: "#fff",
                transition: "color 0.2s",
                "&:hover": { color: "#d1d5db" },
                "@media (min-width:768px)": { display: "none" },
              }}
            >
              <ArrowLeft size="1.2em" />
            </IconButton>
          </div>
        </div>

        {/* Menu Section */}
        <div>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-2 overflow-hidden overflow-y-auto">
            <SidebarNav onNavigate={closeSidebarDrawer} list={getSidebarPages({
              ...usr,
              teaching_staff: identity.teaching_staff,
              non_teaching_staff: identity.non_teaching_staff,
            })} />
          </div>
        </div>
      </div>
    </aside>
    {/* MOBILE OVERLAY */}
    <div
      id="sidebar-overlay"
      className="hidden fixed inset-0 bg-black/60 z-[90]"
      onClick={closeSidebarDrawer}
    ></div>
    </>
  )
}

export default AuthSideBar
