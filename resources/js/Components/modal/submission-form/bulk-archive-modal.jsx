import { useState } from "react"
import UpModal from "../up-modal"
import DropdownField from "@/Components/input/dropdown"
import RadioButton from "@/Components/input/radio"
import BetweenTextfield from "@/Components/input/between-input"
import FormButton from "@/Components/button/button"
import { showWarningModal, showOutputModal, toTitleCase } from "@/others/function"
import { ArchiveService } from "@/others/services/archive-service"

const TYPE_OPTIONS = [
    { val: 'all', label: 'All Types' },
    { val: 'complaint', label: 'Complaint' },
    { val: 'referral', label: 'Referral' },
    { val: 'absent form', label: 'Absent Form' },
]

const BulkArchiveModal = ({ close, closeModal, isEnableOuterClose, pd, schoolYears = [], reload }) => {
    const [type, setType] = useState('all')
    const [filterBy, setFilterBy] = useState('date')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [schoolYear, setSchoolYear] = useState('')
    const [error, setError] = useState('')
    const [sending, setSending] = useState(false)

    const handleSubmit = (e) => {
        e.preventDefault()

        if (filterBy === 'date' && (!dateFrom || !dateTo)) {
            setError('Please provide both a start and end date.')
            return
        }
        if (filterBy === 'school_year' && !schoolYear) {
            setError('Please select a school year.')
            return
        }
        setError('')

        const label = filterBy === 'school_year'
            ? `school year ${schoolYear}`
            : `${dateFrom} through ${dateTo}`

        showWarningModal(
            `Archive every not-yet-archived ${toTitleCase(type)} record from ${label}? This can't be undone from here — recovering has to be done one record at a time afterward.`,
            'Archive Matching Records',
            'Cancel',
            () => {
                setSending(true)
                ArchiveService.bulkArchive(
                    {
                        type,
                        ...(filterBy === 'school_year'
                            ? { school_year: schoolYear }
                            : { date_from: dateFrom, date_to: dateTo }),
                    },
                    (res) => {
                        setSending(false)
                        const summary = Object.entries(res.counts || {})
                            .filter(([, count]) => count > 0)
                            .map(([t, count]) => `${count} ${toTitleCase(t)}`)
                            .join(', ') || 'No matching records'
                        showOutputModal(`Bulk archive complete: ${summary}.`, 's', () => {
                            closeModal(false)
                            reload?.()
                        })
                    },
                    () => setSending(false)
                )
            }
        )
    }

    return (
        <UpModal
            close={close}
            closeModal={closeModal}
            isEnableOuterClose={isEnableOuterClose}
            pd={pd}
            bgColor="bg-white"
            w="w-[32rem]"
        >
            <div className="w-full">
                <h1 className="text-[1.2em] font-bold">Bulk Archive</h1>
                <p className="text-[0.8em] text-gray-500 mt-1">
                    Archive every not-yet-archived record of a chosen type, created within a date range or school year.
                </p>

                <form onSubmit={handleSubmit} className="grid gap-4 mt-4">
                    <div>
                        <DropdownField
                            default={{ val: 'all', label: 'All Types' }}
                            list={TYPE_OPTIONS}
                            onChange={(e) => setType(e.target.value)}
                            name="type"
                            val={type}
                        />
                    </div>

                    <div>
                        <RadioButton
                            list={[
                                { val: 'date', label: 'Date Range' },
                                { val: 'school_year', label: 'School Year' },
                            ]}
                            id="filter_by"
                            name="filter_by"
                            val={filterBy}
                            change={(e) => {
                                setFilterBy(e.target.value)
                                setDateFrom('')
                                setDateTo('')
                                setSchoolYear('')
                            }}
                        />
                    </div>

                    {filterBy === 'date' &&
                    <div>
                        <BetweenTextfield
                            type="date"
                            labels={['Date From', 'Date To']}
                            name={['date_from', 'date_to']}
                            id={['date_from', 'date_to']}
                            data={[dateFrom, dateTo]}
                            setData={(updater) => {
                                const next = typeof updater === 'function' ? updater({ date_from: dateFrom, date_to: dateTo }) : updater
                                setDateFrom(next.date_from ?? '')
                                setDateTo(next.date_to ?? '')
                            }}
                        />
                    </div>}

                    {filterBy === 'school_year' &&
                    <div className="w-full">
                        <DropdownField
                            default={{ val: '', label: 'Select School Year' }}
                            list={schoolYears.map((y) => ({ val: y, label: y }))}
                            onChange={(e) => setSchoolYear(e.target.value)}
                            name="school_year"
                            val={schoolYear}
                        />
                    </div>}

                    {error && <div className="text-[#d12323] text-[12px]"><b>{error}</b></div>}

                    <div className="flex justify-end pt-2">
                        <FormButton type="submit" label="Archive Matching Records" disabled={sending} />
                    </div>
                </form>
            </div>
        </UpModal>
    )
}

export default BulkArchiveModal
