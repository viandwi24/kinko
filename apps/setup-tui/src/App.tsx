import React, { useState, useCallback } from 'react'
import { useApp } from 'ink'
import { SERVICES, type Env } from './config/services.js'
import { readEnvFile, writeEnvFile } from './utils/env.js'
import { EnvSelect } from './screens/EnvSelect.js'
import { KeypairSetup, type KeypairInfo } from './screens/KeypairSetup.js'
import { AirdropSetup } from './screens/AirdropSetup.js'
import { ServiceSelect } from './screens/ServiceSelect.js'
import { FieldInput } from './screens/FieldInput.js'
import { Done } from './screens/Done.js'

type FormValues = Record<string, Record<string, string>>

// Field keys yang akan di-inject dari keypair yang di-generate/paste
const KEYPAIR_FIELDS = ['AGENT_PRIVATE_KEY', 'OPERATOR_PRIVATE_KEY']

type Step =
  | { type: 'env-select' }
  | { type: 'keypair-setup'; env: Env }
  | { type: 'airdrop'; env: Env; keypair: KeypairInfo }
  | { type: 'service-select'; env: Env; keypair: KeypairInfo }
  | {
      type: 'field-input'
      env: Env
      keypair: KeypairInfo
      services: string[]
      serviceIdx: number
      fieldIdx: number
      values: FormValues
    }
  | { type: 'done'; written: string[]; skipped: string[] }

// Airdrop hanya relevan di dev environments
function needsAirdrop(env: Env): boolean {
  return env === 'dev-local' || env === 'dev-devnet'
}

export function App() {
  const { exit } = useApp()
  const [step, setStep] = useState<Step>({ type: 'env-select' })

  const handleEnvSelect = useCallback((env: Env) => {
    setStep({ type: 'keypair-setup', env })
  }, [])

  const handleKeypairDone = useCallback((env: Env, keypair: KeypairInfo) => {
    if (needsAirdrop(env)) {
      setStep({ type: 'airdrop', env, keypair })
    } else {
      setStep({ type: 'service-select', env, keypair })
    }
  }, [])

  const handleAirdropDone = useCallback((env: Env, keypair: KeypairInfo) => {
    setStep({ type: 'service-select', env, keypair })
  }, [])

  const handleServiceSelect = useCallback(
    (env: Env, keypair: KeypairInfo, selectedIds: string[]) => {
      if (selectedIds.length === 0) { exit(); return }

      // Pre-fill dari .env yang sudah ada, fallback ke default
      // Keypair fields di-inject otomatis dari keypair yang sudah dipilih
      const values: FormValues = {}
      for (const id of selectedIds) {
        const svc = SERVICES.find(s => s.id === id)!
        const existing = readEnvFile(svc.envFile)
        values[id] = {}
        for (const field of svc.fields) {
          if (KEYPAIR_FIELDS.includes(field.key)) {
            // Inject dari keypair — tapi boleh di-override user saat input
            values[id][field.key] = keypair.secretKeyJson
          } else {
            values[id][field.key] = existing[field.key] ?? field.default?.(env) ?? ''
          }
        }
      }

      setStep({ type: 'field-input', env, keypair, services: selectedIds, serviceIdx: 0, fieldIdx: 0, values })
    },
    [exit],
  )

  const handleFieldSubmit = useCallback(
    (value: string) => {
      if (step.type !== 'field-input') return
      const { env, keypair, services, serviceIdx, fieldIdx, values } = step

      const svcId = services[serviceIdx]
      const svc   = SERVICES.find(s => s.id === svcId)!
      const field = svc.fields[fieldIdx]

      const newValues: FormValues = {
        ...values,
        [svcId]: { ...values[svcId], [field.key]: value },
      }

      const nextField   = fieldIdx + 1
      const nextService = serviceIdx + 1

      if (nextField < svc.fields.length) {
        setStep({ ...step, fieldIdx: nextField, values: newValues })
      } else if (nextService < services.length) {
        setStep({ ...step, serviceIdx: nextService, fieldIdx: 0, values: newValues })
      } else {
        // Semua selesai — tulis file
        const written: string[] = []
        const skipped: string[] = []

        for (const svcDef of SERVICES) {
          if (services.includes(svcDef.id)) {
            writeEnvFile(svcDef.envFile, newValues[svcDef.id])
            written.push(svcDef.envFile)
          } else {
            skipped.push(svcDef.envFile)
          }
        }

        setStep({ type: 'done', written, skipped })
      }
    },
    [step],
  )

  if (step.type === 'env-select') {
    return <EnvSelect onSelect={handleEnvSelect} />
  }

  if (step.type === 'keypair-setup') {
    return (
      <KeypairSetup onDone={(kp) => handleKeypairDone(step.env, kp)} />
    )
  }

  if (step.type === 'airdrop') {
    return (
      <AirdropSetup
        env={step.env}
        keypair={step.keypair}
        onDone={() => handleAirdropDone(step.env, step.keypair)}
      />
    )
  }

  if (step.type === 'service-select') {
    return (
      <ServiceSelect
        env={step.env}
        onConfirm={(ids) => handleServiceSelect(step.env, step.keypair, ids)}
      />
    )
  }

  if (step.type === 'field-input') {
    const { env, services, serviceIdx, fieldIdx, values } = step
    const svcId = services[serviceIdx]
    const svc   = SERVICES.find(s => s.id === svcId)!
    const field = svc.fields[fieldIdx]

    return (
      <FieldInput
        env={env}
        service={svc}
        field={field}
        currentValue={values[svcId]?.[field.key] ?? ''}
        serviceNum={serviceIdx + 1}
        totalServices={services.length}
        fieldNum={fieldIdx + 1}
        totalFields={svc.fields.length}
        onSubmit={handleFieldSubmit}
      />
    )
  }

  if (step.type === 'done') {
    return <Done written={step.written} skipped={step.skipped} onExit={exit} />
  }

  return null
}
