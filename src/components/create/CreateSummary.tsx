import { SettingsCard, SettingsRow } from '../settings/Section'

export type SummaryRow = {
  label: string
  value: string
}

export type CreateSummaryProps = {
  title: string
  rows: SummaryRow[]
  /** Free text under the rows, e.g. the names of the people being added. */
  note?: string
}

/** The last look before something exists on the server. */
export function CreateSummary({ title, rows, note }: CreateSummaryProps) {
  return (
    <SettingsCard title={title}>
      {rows.map((row) => (
        <SettingsRow key={row.label} label={row.label}>
          <span className="text-sm break-words text-fg-muted">{row.value}</span>
        </SettingsRow>
      ))}
      {note === undefined || note.length === 0 ? null : (
        <p className="text-xs text-pretty text-fg-muted">{note}</p>
      )}
    </SettingsCard>
  )
}
