import ProfilePic from "../other/profile-pic"
import { getProfilePic } from "@/others/function"
import SidebarNav from "./sidebar-nav"
import { getSidebarPages } from "./sidebar-pages"
import "@/Responsive/sidebar-responsive.css"
import { Link, usePage } from "@inertiajs/react"
import { IconButton } from "@mui/material"
import bg from "@/images/bg-pilar.jpg"
import { ArrowLeft } from "lucide-react"

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
    <aside
      className={`
        flex-shrink-0 flex-grow-0
        w-[19rem] transition-all h-screen bg-gray-950 sticky top-0
        max-[768px]:fixed max-[768px]:top-0 max-[768px]:left-0 max-[768px]:w-0 max-[768px]:z-[100]
      `}
    >
      <div className="w-full grid gap-5 overflow-hidden">
        {/* Header Section */}
        <div>
          <div
            className="flex text-white items-center gap-3 px-5 py-2 bg-no-repeat bg-center bg-cover relative"
            style={{ backgroundImage: `url(${bg})` }}
          >
            {/* dark overlay */}
            <div className="bg-black/70 absolute w-full h-full left-0 top-0"></div>

            {/* profile */}
            <div className="z-10">
              <ProfilePic src={"/default-pic/pilar.png"} size={2.5} />
            </div>

            {/* text */}
            <div className="w-full z-10">
              <h1 className="text-[1em] font-bold">PilarPODHED</h1>
              <h1 className="text-[0.7em]">Pilar College of Zamboanga City, Inc.</h1>
            </div>

            {/* arrow button — visible only on phone-sized screens, not tablet/desktop */}
            <IconButton
              onClick={() => {
                const aside = document.querySelector("aside"),
                      bg = document.querySelector("#sidebar-overlay")
                aside.classList.toggle("max-[768px]:w-0")
                bg.classList.toggle('hidden')
              }} // define this function to close/collapse sidebar
              sx={{
                position: "absolute",
                right: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 20,
                color: "#fff",
                transition: "color 0.2s",
                "&:hover": { color: "#d1d5db" },
                "@media (min-width:640px)": { display: "none" },
              }}
            >
              <ArrowLeft size="1.2em" />
            </IconButton>
          </div>



          {/* User Section */}
          <div className="text-white px-5 transition-all border-gray-400/50 border-b hover:bg-white/5 cursor-pointer">
            <Link href={`/profile/${usr.username}`}>
              <div className="w-full flex items-center gap-3 py-2">
                <ProfilePic
                  src={getProfilePic(identity.profile?.profile_picture, identity.profile?.sex)}
                  size={2.5}
                />
                <div>
                  <h1 className="text-[1.1em] font-bold">{identity.profile?.first_name}</h1>
                  <h1 className="text-[0.8em]">{roleLabel()}</h1>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Menu Section */}
        <div>
          <div className="grid gap-2 overflow-hidden overflow-y-auto">
            <h1 className="px-10 text-gray-400 text-[0.9em]">Menu</h1>
            <SidebarNav list={getSidebarPages({
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
      onClick={(e) => {
        document.querySelector("aside").classList.toggle("max-[768px]:w-0")
        e.target.classList.toggle("hidden")
      }}
    ></div>
    </>
  )
}

export default AuthSideBar
