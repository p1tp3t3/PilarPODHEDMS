import { useState, useEffect, useMemo } from "react";
import ListSkeleton from "../reload/list-skeleton";
import SearchBar from "@/Components/input/search-bar";
import DropdownField from "@/Components/input/dropdown";
import { ViolationService } from "@/others/services/violation-service";
import { toTitleCase, ordinal } from "@/others/function";
import {
    List,
    ListItem,
    ListItemText,
    Divider,
    Chip,
    Stack,
    Typography,
    Pagination,
    Box,
} from "@mui/material";

const STATUS_OPTIONS = [
    { val: "1", label: "Major" },
    { val: "0", label: "Minor" },
]

const OffenseList = ({ list = null }) => {
    const [offenseList, setOffenseList] = useState(list);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        // Prefect dashboard passes the list down from the controller;
        // fall back to fetching it only when no list prop was given.
        if (list != null) return;

        ViolationService.getOffenseList((data) => {
            setOffenseList(data);
        });
    }, []);

    // SEARCH + STATUS FILTER
    const filteredList = useMemo(() => {
        if (!offenseList) return []

        return offenseList.filter((item) => {
            const matchesSearch = !search.trim() ||
                item.violation_name?.toLowerCase().includes(search.toLowerCase())
            const matchesStatus = !status || String(item.offense_status) === status

            return matchesSearch && matchesStatus
        })
    }, [offenseList, search, status])

    const handleSearch = (e) => {
        setSearch(e.target.value)
        setCurrentPage(1)
    }

    const handleStatusChange = (e) => {
        setStatus(e.target.value)
        setCurrentPage(1)
    }

    // PAGINATION LOGIC
    const indexOfLast = currentPage * itemsPerPage;
    const indexOfFirst = indexOfLast - itemsPerPage;
    const currentList = filteredList.slice(indexOfFirst, indexOfLast);
    const totalPages = Math.ceil((filteredList?.length || 0) / itemsPerPage);

    return (
        <div className="w-full p-4 sm:p-5 bg-white rounded-md shadow">

            {/* SEARCH BAR + STATUS FILTER */}
            <div className="mb-5 flex flex-col sm:flex-row gap-3">
                <SearchBar
                    plc="Search Offense"
                    w="w-full sm:w-[25rem]"
                    search={search}
                    setSearch={setSearch}
                    handleSearch={handleSearch}
                />
                <div className="w-full sm:w-[12rem]">
                    <DropdownField
                        default={{ val: "", label: "All Status" }}
                        list={STATUS_OPTIONS}
                        onChange={handleStatusChange}
                        name="status"
                        val={status}
                    />
                </div>
            </div>

            {/* LOADING */}
            {offenseList === null && (
                <div className="py-10 flex justify-center">
                    <ListSkeleton rows={4} />
                </div>
            )}

            {/* DEFAULT WHEN BACKEND RETURNS EMPTY */}
            {offenseList !== null && offenseList.length === 0 && (
                <div className="py-10 text-center text-gray-500 text-sm">
                    No offenses found.
                </div>
            )}

            {/* DEFAULT WHEN SEARCH RETURNS NO MATCHES */}
            {offenseList !== null &&
                offenseList.length > 0 &&
                filteredList.length === 0 && (
                    <div className="py-10 text-center text-gray-500 text-sm">
                        No results found for "<b>{search}</b>"
                    </div>
                )}

            {/* LIST VIEW */}
            {filteredList.length > 0 && (
                <List sx={{ width: "100%", bgcolor: "background.paper" }} disablePadding>
                    {currentList.map((offense, index) => (
                        <OffenseListItem
                            key={offense.id ?? index}
                            i={indexOfFirst + index}
                            data={offense}
                            isLast={index === currentList.length - 1}
                        />
                    ))}
                </List>
            )}

            {/* PAGINATION */}
            {totalPages > 1 && filteredList.length > 0 && (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                    <Pagination
                        count={totalPages}
                        page={currentPage}
                        onChange={(e, page) => setCurrentPage(page)}
                        color="primary"
                        shape="rounded"
                    />
                </Box>
            )}

        </div>
    );
};

const OffenseListItem = ({ i, data, isLast }) => {
    const isMajor = !!data.offense_status;

    return (
        <>
            <ListItem alignItems="flex-start" sx={{ py: 2, px: { xs: 1, sm: 2 } }}>
                <ListItemText
                    primary={
                        <Stack direction="column" spacing={1}>
                            <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
                                <Typography component="span" sx={{ fontWeight: 700 }}>
                                    {i + 1}. {toTitleCase(data.violation_name)}
                                </Typography>
                                <Chip
                                    label={isMajor ? "Major" : "Minor"}
                                    size="small"
                                    color={isMajor ? "error" : "warning"}
                                />
                            </Stack>
                            {data.keywords?.length > 0 && (
                                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                    {data.keywords.map((kw, j) => (
                                        <Chip key={j} label={kw} size="small" variant="outlined" />
                                    ))}
                                </Stack>
                            )}
                        </Stack>
                    }
                    secondary={
                        <Box
                            sx={{
                                mt: 1.5,
                                display: "grid",
                                gap: 1.5,
                                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 1fr" },
                            }}
                        >
                            {[1, 2, 3, 4, 5, 6].map((occ) => {
                                const penaltiesForOcc =
                                    data.penalties
                                        ?.filter((p) => p.occurrence == occ)
                                        .map((p) => {
                                            const desc = p.penalty?.description ?? p.penalty_description;
                                            const ref = p.penalty?.ref_number;
                                            return ref != null ? `${ref} — ${desc}` : desc;
                                        })
                                        ?? [];

                                return (
                                    <Box key={occ}>
                                        <Typography
                                            component="span"
                                            variant="body2"
                                            sx={{ fontWeight: 600, color: "text.primary" }}
                                        >
                                            {ordinal(occ)} Offense:
                                        </Typography>
                                        <Stack
                                            direction="row"
                                            spacing={0.5}
                                            flexWrap="wrap"
                                            useFlexGap
                                            sx={{ mt: 0.5 }}
                                        >
                                            {penaltiesForOcc.length > 0 ? (
                                                penaltiesForOcc.map((desc, j) => (
                                                    <Chip key={j} label={desc} size="small" variant="outlined" />
                                                ))
                                            ) : (
                                                <Typography variant="caption" color="text.secondary" fontStyle="italic">
                                                    No Penalty
                                                </Typography>
                                            )}
                                        </Stack>
                                    </Box>
                                );
                            })}
                        </Box>
                    }
                    secondaryTypographyProps={{ component: "div" }}
                />
            </ListItem>
            {!isLast && <Divider component="li" />}
        </>
    );
};

export default OffenseList;
