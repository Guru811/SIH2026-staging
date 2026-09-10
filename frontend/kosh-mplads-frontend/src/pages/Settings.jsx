import PageTransition from '../components/PageTransition'
import { Toggle, Segmented, SwatchPicker } from '../components/Toggle'
import { useTheme } from '../context/ThemeContext'

export default function Settings() {
  const { theme, accent, density, motion, notifyHigh, notifyMedium, accents, update } = useTheme()

  return (
    <PageTransition>
      <div className="mb-8">
        <h1 className="text-xl font-bold font-display">Settings</h1>
        <p className="text-sm text-dim mt-1">Personalize how kosh looks and what it notifies you about.</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card title="Appearance">
          <Row label="Theme">
            <Segmented
              value={theme}
              onChange={(v) => update({ theme: v })}
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' }
              ]}
            />
          </Row>
          <Row label="Accent color">
            <SwatchPicker value={accent} onChange={(v) => update({ accent: v })} swatches={accents} />
          </Row>
          <Row label="Density">
            <Segmented
              value={density}
              onChange={(v) => update({ density: v })}
              options={[
                { value: 'comfortable', label: 'Comfortable' },
                { value: 'compact', label: 'Compact' }
              ]}
            />
          </Row>
          <Toggle checked={motion} onChange={(v) => update({ motion: v })} label="Enable animations & transitions" />
        </Card>

        <Card title="Notifications">
          <Toggle
            checked={notifyHigh}
            onChange={(v) => update({ notifyHigh: v })}
            label="Notify me about CRITICAL / HIGH risk alerts"
          />
          <Toggle
            checked={notifyMedium}
            onChange={(v) => update({ notifyMedium: v })}
            label="Also notify me about MEDIUM risk alerts"
          />
          <p className="text-xs text-dim pt-2">
            These control what shows up on the Alerts page and the bell badge in the top bar.
          </p>
        </Card>
      </div>
    </PageTransition>
  )
}

function Card({ title, children }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 card-hover">
      <h2 className="text-sm font-semibold text-ink mb-1">{title}</h2>
      <div className="divide-y divide-line/70">{children}</div>
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-ink">{label}</span>
      {children}
    </div>
  )
}
