import { APIRequest } from "../classes/api-req";

export const SchoolYearService = {
    updateSemesterDates(id, date_start, date_end, setter, success, error) {
        const f = new FormData();
        f.append("id", id);
        f.append("date_start", date_start);
        f.append("date_end", date_end);
        const api = new APIRequest("/super-admin/school-year/semester/update-dates", "post", f, setter, success, error);
        api.fetchData();
    },
};
