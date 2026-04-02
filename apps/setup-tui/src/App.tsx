import React, { useState, useCallback } from 'react'
import { useApp } from 'ink'
import { SERVICES, type Env } from './config/services.js'
import { readEnvFile, writeEnvFile } from './utils/env.js'
import { EnvSelect } from './screens/EnvSelect.js'
import { ServiceSelect } from './screens/ServiceSelect.js'
import { FieldInput } from './screens/FieldInput.js'
import { Done } from './screens/Done.js'

type FormValues = Record<string, Record<string, string>> // serviceId → fieldKey → value

type Step =
  | { type: 'env-select' }
  | { type: 'service-select'; env: Env }
  | {
      type: 'field-input'
      env: Env
      services: string[]
      serviceIdx: number
      fieldIdx: number
      values: FormValues
    }
  | { type: 'done'; written: string[]; skipped: string[] }

export function App() {
  const { exit } = useApp()
  const [step, setStep] = useState<Step>({ type: 'env-select' })

  const handleEnvSelect = useCallback((env: Env) => {
    setStep({ type: 'service-select', env })
  }, [])

  const handleServiceSelect = useCallback(
    (env: Env, selectedIds: string[]) => {
      if (selectedIds.length === 0) {
        exit()
        return
      }

      // Pre-fill values dari .env yang sudah ada, fallback ke default
      const values: FormValues = {}
      for (const id of selectedIds) {
        const svc = SERVICES.find(s => s.id === id)!
        const existing = readEnvFile(svc.envFile)
        values[id] = {}
        for (const field of svc.fields) {
          values[id][field.key] =
            existing[field.key] ?? field.default?.(env) ?? ''
        }
      }

      setStep({ type: 'field-input', env, services: selectedIds, serviceIdx: 0, fieldIdx: 0, values })
    },
    [exit],
  )

  const handleFieldSubmit = useCallback(
    (value: string) => {
      if (step.type !== 'field-input') return
      const { env, services, serviceIdx, fieldIdx, values } = step

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
        // Lanjut field berikutnya di service yang sama
        setStep({ ...step, fieldIdx: nextField, values: newValues })
      } else if (nextService < services.length) {
        // Lanjut service berikutnya
        setStep({ ...step, serviceIdx: nextService, fieldIdx: 0, values: newValues })
      } else {
        // Semua selesai — tulis file
        const allIds    = SERVICES.map(s => s.id)
        const written:  string[] = []
        const skipped:  string[] = []

        for (const id of allIds) {
          const svcDef = SERVICES.find(s => s.id === id)!
          if (services.includes(id)) {
            writeEnvFile(svcDef.envFile, newValues[id])
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

  if (step.type === 'service-select') {
    return (
      <ServiceSelect
        env={step.env}
        onConfirm={(ids) => handleServiceSelect(step.env, ids)}
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
