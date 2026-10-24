import { ReportArchiveService } from "@/others/services/report-archive-service";
import { readableDate, readableTime, toTitleCase } from "@/others/function";
import React, { useState, memo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const IncidentGroupList = ({ user_id, list: listProp = null }) => {
  const [openIds, setOpenIds] = useState(() => new Set());
  const [list, setList] = useState(listProp ?? []);
  const [loading, setLoading] = useState(listProp == null);

  useEffect(() => {
    // The profile controller now passes the incident groups down as a
    // prop; only fall back to the (legacy) API call when none is given.
    if (listProp != null) {
      setList(listProp);
      setLoading(false);
      return;
    }

    let cancelled = false;

    ReportArchiveService.getStudentIncidentGroups(user_id, (data) => {
      if (cancelled) return;
      setList(Array.isArray(data) ? data : []);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user_id, listProp]);

  const toggle = (violation_id) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(violation_id)) next.delete(violation_id);
      else next.add(violation_id);
      return next;
    });
  };

  if (loading) return <div style={{ padding: 12 }}>Loading…</div>;
  if (!Array.isArray(list) || list.length === 0) {
    return <div style={{ padding: 12 }}>No violations found.</div>;
  }

  return (
    <div style={{ width: "100%" }}>
      {list.map((group) => (
        <Row
          key={group.violation_id}
          data={group} // expects: violation_id, violation_name, incidents
          isOpen={openIds.has(group.violation_id)}
          onToggle={() => toggle(group.violation_id)}
        />
      ))}
    </div>
  );
};

const Row = memo(({ data, isOpen, onToggle }) => {
  const incidents = Array.isArray(data?.incidents) ? data.incidents : [];

  return (
    <div
      style={{
        border: "1px solid var(--dm-border, #e5e7eb)",
        borderRadius: 10,
        marginBottom: 10,
        overflow: "hidden",
        background: "var(--dm-surface, #fff)",
      }}
    >
      {/* Violation row */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "12px 14px",
          background: "var(--dm-surface, #fff)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontWeight: 700 }}>{data?.violation_name ?? "—"}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {incidents.length} incident{incidents.length === 1 ? "" : "s"}
          </div>
        </div>

        <motion.div
          style={{ fontSize: 14, opacity: 0.7 }}
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.18 }}
        >
          <i className="fa-solid fa-chevron-down"></i>
        </motion.div>
      </button>

      {/* Animated dropdown wrapper */}
      <AnimatePresence initial={false}>
        {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22 }}
          style={{
            overflow: "hidden",
            background: "var(--dm-surface-2, #f9fafb)",
          }}
        >
        {/* Inner content */}
        <div style={{ padding: 10 }}>
          {incidents.length === 0 ? (
            <div style={{ padding: 10, opacity: 0.7 }}>No incidents.</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {incidents.map((incident) => (
                <li
                  key={incident.complaint_subject_id}
                  style={{
                    background: "var(--dm-surface, #fff)",
                    border: "1px solid var(--dm-border, #e5e7eb)",
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "baseline",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>
                      Case No. {incident.case_number}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      {incident.created_at
                        ? new Date(
                            String(incident.created_at).replace(" ", "T")
                          ).toLocaleString()
                        : ""}
                    </div>
                  </div>

                  <div style={{ marginTop: 6 }}>
                    {incident?.reference_number && (
                      <div style={{ fontSize: 13, opacity: 0.8 }}>
                          Reference No.: <b>{incident.reference_number}</b>
                      </div>
                    )}
                    {incident?.incident && (
                      <div style={{ fontSize: 13, opacity: 0.8 }}>
                          Incident Reported: <b>{incident.incident}</b>
                      </div>
                    )}

                    <div style={{ fontSize: 13, opacity: 0.8 }}>
                        Resolved Since: {readableDate(incident?.resolved_since)} ({readableTime(incident?.resolved_since)})
                    </div>
                  </div>

                  {/* Only sent to the prefect. */}
                  {incident?.summary && (
                    <div style={{ fontSize: 13, opacity: 0.8 }}>
                      Prefect's Remark: {toTitleCase(incident.summary)}
                    </div>
                  )}

                  {/* Offenses (same JSON key: offenses) */}
                  {Array.isArray(incident.offenses) &&
                    incident.offenses.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            opacity: 0.7,
                            marginBottom: 6,
                          }}
                        >
                          Violations
                        </div>

                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 6,
                          }}
                        >
                          {incident.offenses.map((offense) => (
                            <span
                              key={offense.id}
                              style={{
                                fontSize: 12,
                                padding: "4px 8px",
                                borderRadius: 999,
                                border: "1px solid var(--dm-border, #e5e7eb)",
                                background: "var(--dm-surface, #fff)",
                              }}
                            >
                              {offense.name ? toTitleCase(offense.name) : "Unknown Violation"}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                </li>
              ))}
            </ul>
          )}
        </div>
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default IncidentGroupList;