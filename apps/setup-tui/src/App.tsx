import { useState, useCallback } from 'react'
import { useApp } from 'ink'
import { SERVICES, type Env, type BaseUrls } from './config/services.js'
import { readEnvFile, writeEnvFile } from './utils/env.js'
import { generateAgentMetadata } from './utils/metadata.js'
import { MainMenu, type MainMenuChoice } from './screens/MainMenu.js'
import { EnvSelect } from './screens/EnvSelect.js'
import { BaseUrlSetup } from './screens/BaseUrlSetup.js'
import { KeypairSetup, type KeypairInfo } from './screens/KeypairSetup.js'
import { WalletFund } from './screens/WalletFund.js'
import { ServiceSelect } from './screens/ServiceSelect.js'
import { FieldInput } from './screens/FieldInput.js'
import { Preview } from './screens/Preview.js'
import { AgentRegister } from './screens/AgentRegister.js'
import { Done } from './screens/Done.js'

type FormValues = Record<string, Record<string, string>>

// Keys yang di-inject otomatis dari keypair — tidak ditampilkan saat input
const KEYPAIR_FIELDS = ['SERVER_AGENT_PRIVATE_KEY', 'OPERATOR_PRIVATE_KEY']

// ── State machine ─────────────────────────────────────────────────────────────
type Step =
  | { type: 'main-menu' }
  | { type: 'env-select';     mode: MainMenuChoice }
  | { type: 'base-url';       mode: MainMenuChoice; env: Env }
  | { type: 'keypair-setup';  mode: MainMenuChoice; env: Env; baseUrls: BaseUrls }
  | { type: 'wallet-fund';    env: Env; baseUrls: BaseUrls; keypair: KeypairInfo }
  | { type: 'service-select'; env: Env; baseUrls: BaseUrls; keypair: KeypairInfo }
  | {
      type: 'field-input'
      env: Env; baseUrls: BaseUrls; keypair: KeypairInfo
      services: string[]
      serviceIdx: number
      fieldIdx: number
      values: FormValues
    }
  | {
      type: 'preview'
      env: Env; baseUrls: BaseUrls; keypair: KeypairInfo
      services: string[]
      values: FormValues
    }
  | {
      type: 'agent-register'
      env: Env; baseUrls: BaseUrls
      services: string[]
      values: FormValues
      written: string[]
      skipped: string[]
    }
  | { type: 'done'; written: string[]; skipped: string[] }

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Cari field index berikutnya yang bukan keypair field */
function nextVisibleField(svc: typeof SERVICES[0], fromIdx: number): number {
  let i = fromIdx
  while (i < svc.fields.length && KEYPAIR_FIELDS.includes(svc.fields[i].key)) i++
  return i
}

/** Prefill values dari .env yang sudah ada + defaults + keypair injection */
function buildInitialValues(
  selectedIds: string[],
  env: Env,
  baseUrls: BaseUrls,
  keypair: KeypairInfo,
): FormValues {
  const values: FormValues = {}
  for (const id of selectedIds) {
    const svc = SERVICES.find(s => s.id === id)!
    const existing = readEnvFile(svc.envFile)
    values[id] = {}
    for (const field of svc.fields) {
      if (KEYPAIR_FIELDS.includes(field.key)) {
        values[id][field.key] = keypair.secretKeyJson
      } else {
        values[id][field.key] = existing[field.key] ?? field.default?.(env, baseUrls) ?? ''
      }
    }
  }
  return values
}

// ── Component ─────────────────────────────────────────────────────────────────

export function App() {
  const { exit } = useApp()
  const [step, setStep] = useState<Step>({ type: 'main-menu' })

  // 0. Main menu
  const handleMainMenu = useCallback((choice: MainMenuChoice) => {
    setStep({ type: 'env-select', mode: choice })
  }, [])

  // 1. Env select
  const handleEnvSelect = useCallback((mode: MainMenuChoice, env: Env) => {
    setStep({ type: 'base-url', mode, env })
  }, [])

  // 2. Base URL
  const handleBaseUrlDone = useCallback((mode: MainMenuChoice, env: Env, baseUrls: BaseUrls) => {
    setStep({ type: 'keypair-setup', mode, env, baseUrls })
  }, [])

  // 3. Keypair
  const handleKeypairDone = useCallback((mode: MainMenuChoice, env: Env, baseUrls: BaseUrls, keypair: KeypairInfo) => {
    if (mode === 'register') {
      // Jalur register-only: langsung ke agent-register, baca dari apps/server/.env
      // AgentRegister akan mapping SERVER_AGENT_PRIVATE_KEY → OPERATOR_PRIVATE_KEY dst.
      const serverExisting = readEnvFile('apps/server/.env')
      // Override keypair jika user generate baru di step ini
      const serverValues: Record<string, string> = {
        ...serverExisting,
        SERVER_AGENT_PRIVATE_KEY: keypair.secretKeyJson,
        SERVER_URL: serverExisting['SERVER_URL'] || baseUrls.serverUrl,
      }
      setStep({
        type: 'agent-register',
        env,
        baseUrls,
        services: ['server'],
        values: { server: serverValues },
        written: [],
        skipped: [],
      })
    } else {
      setStep({ type: 'wallet-fund', env, baseUrls, keypair })
    }
  }, [])

  // 4. Wallet fund
  const handleWalletFundDone = useCallback((env: Env, baseUrls: BaseUrls, keypair: KeypairInfo) => {
    setStep({ type: 'service-select', env, baseUrls, keypair })
  }, [])

  // 5. Service select
  const handleServiceSelect = useCallback(
    (env: Env, baseUrls: BaseUrls, keypair: KeypairInfo, selectedIds: string[]) => {
      if (selectedIds.length === 0) { exit(); return }
      const values = buildInitialValues(selectedIds, env, baseUrls, keypair)
      const firstSvc = SERVICES.find(s => s.id === selectedIds[0])!
      const firstField = nextVisibleField(firstSvc, 0)
      setStep({ type: 'field-input', env, baseUrls, keypair, services: selectedIds, serviceIdx: 0, fieldIdx: firstField, values })
    },
    [exit],
  )

  // 6. Field input
  const handleFieldSubmit = useCallback(
    (value: string) => {
      if (step.type !== 'field-input') return
      const { env, baseUrls, keypair, services, serviceIdx, fieldIdx, values } = step

      const svcId  = services[serviceIdx]
      const svc    = SERVICES.find(s => s.id === svcId)!
      const field  = svc.fields[fieldIdx]
      const finalValue = value.trim() || values[svcId]?.[field.key] || ''

      const newValues: FormValues = {
        ...values,
        [svcId]: { ...values[svcId], [field.key]: finalValue },
      }

      // Cari field berikutnya yang visible
      const nextFieldIdx = nextVisibleField(svc, fieldIdx + 1)

      if (nextFieldIdx < svc.fields.length) {
        // Masih ada field di service yang sama
        setStep({ ...step, fieldIdx: nextFieldIdx, values: newValues })
      } else {
        // Cari service berikutnya yang punya visible field
        let nextSvcIdx = serviceIdx + 1
        let nextFieldInSvc = -1
        while (nextSvcIdx < services.length) {
          const ns = SERVICES.find(s => s.id === services[nextSvcIdx])!
          const nf = nextVisibleField(ns, 0)
          if (nf < ns.fields.length) { nextFieldInSvc = nf; break }
          nextSvcIdx++
        }

        if (nextFieldInSvc >= 0) {
          setStep({ ...step, serviceIdx: nextSvcIdx, fieldIdx: nextFieldInSvc, values: newValues })
        } else {
          // Semua field selesai → preview
          setStep({ type: 'preview', env, baseUrls, keypair, services, values: newValues })
        }
      }
    },
    [step],
  )

  // 6b. Preview back → kembali ke field terakhir
  const handlePreviewBack = useCallback(() => {
    if (step.type !== 'preview') return
    const { env, baseUrls, keypair, services, values } = step
    // Cari service + field terakhir yang visible
    let lastSvcIdx = services.length - 1
    let lastFieldIdx = -1
    while (lastSvcIdx >= 0) {
      const svc = SERVICES.find(s => s.id === services[lastSvcIdx])!
      for (let i = svc.fields.length - 1; i >= 0; i--) {
        if (!KEYPAIR_FIELDS.includes(svc.fields[i].key)) { lastFieldIdx = i; break }
      }
      if (lastFieldIdx >= 0) break
      lastSvcIdx--
    }
    setStep({ type: 'field-input', env, baseUrls, keypair, services, serviceIdx: lastSvcIdx, fieldIdx: lastFieldIdx, values })
  }, [step])

  // 7. Preview confirm → tulis file lalu agent register atau done
  const handlePreviewConfirm = useCallback(() => {
    if (step.type !== 'preview') return
    const { env, baseUrls, services, values } = step

    const written: string[] = []
    const skipped: string[] = []
    for (const svcDef of SERVICES) {
      if (services.includes(svcDef.id)) {
        writeEnvFile(svcDef.envFile, values[svcDef.id])
        written.push(svcDef.envFile)
      } else {
        skipped.push(svcDef.envFile)
      }
    }

    generateAgentMetadata(baseUrls.serverUrl)

    // Trigger agent register jika server dipilih (butuh SERVER_AGENT_PRIVATE_KEY + RPC)
    if (services.includes('server')) {
      setStep({ type: 'agent-register', env, baseUrls, services, values, written, skipped })
    } else {
      setStep({ type: 'done', written, skipped })
    }
  }, [step])

  // ── Render ────────────────────────────────────────────────────────────────

  if (step.type === 'main-menu') {
    return <MainMenu onSelect={handleMainMenu} />
  }

  if (step.type === 'env-select') {
    return <EnvSelect onSelect={(env) => handleEnvSelect(step.mode, env)} />
  }

  if (step.type === 'base-url') {
    return <BaseUrlSetup env={step.env} onDone={(urls) => handleBaseUrlDone(step.mode, step.env, urls)} />
  }

  if (step.type === 'keypair-setup') {
    return <KeypairSetup onDone={(kp) => handleKeypairDone(step.mode, step.env, step.baseUrls, kp)} />
  }

  if (step.type === 'wallet-fund') {
    return (
      <WalletFund
        env={step.env}
        keypair={step.keypair}
        onDone={() => handleWalletFundDone(step.env, step.baseUrls, step.keypair)}
      />
    )
  }

  if (step.type === 'service-select') {
    return (
      <ServiceSelect
        env={step.env}
        onConfirm={(ids) => handleServiceSelect(step.env, step.baseUrls, step.keypair, ids)}
      />
    )
  }

  if (step.type === 'field-input') {
    const { env, services, serviceIdx, fieldIdx, values } = step
    const svcId = services[serviceIdx]
    const svc   = SERVICES.find(s => s.id === svcId)!
    const field = svc.fields[fieldIdx]

    // Hitung total visible fields across all services untuk progress
    const totalVisible = services.reduce((acc, id) => {
      const s = SERVICES.find(x => x.id === id)!
      return acc + s.fields.filter(f => !KEYPAIR_FIELDS.includes(f.key)).length
    }, 0)
    const doneVisible = services.slice(0, serviceIdx).reduce((acc, id) => {
      const s = SERVICES.find(x => x.id === id)!
      return acc + s.fields.filter(f => !KEYPAIR_FIELDS.includes(f.key)).length
    }, 0) + svc.fields.slice(0, fieldIdx + 1).filter(f => !KEYPAIR_FIELDS.includes(f.key)).length

    return (
      <FieldInput
        key={`${svcId}-${field.key}`}
        env={env}
        service={svc}
        field={field}
        currentValue={values[svcId]?.[field.key] ?? ''}
        serviceNum={serviceIdx + 1}
        totalServices={services.length}
        fieldNum={doneVisible}
        totalFields={totalVisible}
        onSubmit={handleFieldSubmit}
      />
    )
  }

  if (step.type === 'preview') {
    return (
      <Preview
        services={step.services}
        values={step.values}
        onConfirm={handlePreviewConfirm}
        onBack={handlePreviewBack}
      />
    )
  }

  if (step.type === 'agent-register') {
    return (
      <AgentRegister
        selectedServices={step.services}
        allValues={step.values}
        baseUrls={step.baseUrls}
        onDone={() => setStep({ type: 'done', written: step.written, skipped: step.skipped })}
      />
    )
  }

  if (step.type === 'done') {
    return <Done written={step.written} skipped={step.skipped} onExit={exit} />
  }

  return null
}
