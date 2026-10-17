import { Link } from "@inertiajs/react"
import { ChevronRight } from "lucide-react"

// Directory-style path for detail pages, e.g.
//   Violation Management › Unexcused Tardiness or Absence
// Earlier steps are links back to the previous levels; the last one is
// the current page.
//   items: [{ label, href? }]
const BreadcrumbNav = ({ items = [] }) => (
    <nav aria-label="Breadcrumb" className="min-w-0">
        <ol className="flex flex-wrap items-center gap-1 text-[0.85em] text-gray-500">
            {items.map((item, i) => {
                const last = i === items.length - 1
                return (
                    <li key={i} className="flex items-center gap-1 min-w-0">
                        {i > 0 && <ChevronRight size={14} className="shrink-0 text-gray-400" />}
                        {item.href && !last ? (
                            <Link href={item.href} className="hover:text-blue-700 hover:underline truncate max-w-[16rem]">
                                {item.label}
                            </Link>
                        ) : (
                            <span className={`truncate max-w-[20rem] ${last ? "font-semibold text-gray-900" : ""}`} aria-current={last ? "page" : undefined}>
                                {item.label}
                            </span>
                        )}
                    </li>
                )
            })}
        </ol>
    </nav>
)

export default BreadcrumbNav
