import { router } from "@inertiajs/react"
import { Pagination } from "@mui/material"

const PaginationButton = ({ meta }) => {
    const currentPage = meta?.current_page ?? 1
    const lastPage = meta?.last_page ?? 1

    if (lastPage <= 1) return null

    const handleChange = (e, page) => {
        const params = new URLSearchParams(window.location.search)
        params.set("page", page)
        router.visit(`${window.location.pathname}?${params.toString()}`, { preserveScroll: true })
    }

    return (
        <div className="flex justify-center mt-4">
            <Pagination
                count={lastPage}
                page={currentPage}
                onChange={handleChange}
                color="primary"
                shape="rounded"
            />
        </div>
    )
}

export default PaginationButton
