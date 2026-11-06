import { Link } from "@inertiajs/react"
import { ChevronRight } from "lucide-react"

/**
 * One section of the dashboard info bar: an icon, a main line and a muted
 * second line. Pass `href` (link) or `onClick` (button) to make it clickable;
 * a chevron then shows on the right.
 */
export const InfoSegment = ({ icon, title, subtitle, href, onClick }) => {
    const clickable = Boolean(href || onClick)
    const body = (
        <>
            <span className="w-9 h-9 shrink-0 rounded-full bg-blue-50 text-blue-600 grid place-items-center">
                {icon}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[0.85em] font-semibold text-gray-800">{title}</span>
                <span className="block truncate text-[0.75em] text-gray-500 mt-0.5">{subtitle}</span>
            </span>
            {clickable && <ChevronRight size={16} className="shrink-0 text-gray-400" />}
        </>
    )
    const cls = `w-full min-w-0 flex items-center gap-3 px-4 py-3 text-left ${clickable ? "hover:bg-gray-50 transition-colors" : ""}`

    if (href) return <Link href={href} className={cls}>{body}</Link>
    if (onClick) return <button type="button" onClick={onClick} className={cls}>{body}</button>
    return <div className={cls}>{body}</div>
}

export default InfoSegment
