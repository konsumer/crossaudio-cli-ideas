#!/usr/bin/env node

import nopt from 'nopt'
import { play, Params } from '@crossaudio/core'
import easymidi from 'easymidi'
import esm from 'esm'

const usage = `Usage: crossaudio FILE.js [...OPTIONS]

Where FILE.js is your synth definition and OPTIONS is any midi bindings you want.

Examples:

Connect cutoff param to MIDI CC#10 and resonance to MIDI CC#11
  crossaudio synth.js --cutoff=10 --resonance=11

Connect full note object to note param
  crossaudio synth.js --note=note
`

const { argv, ...params } = nopt({}, {}, process.argv, 2)

if (!argv.remain.length) {
  console.error(usage)
  process.exit(1)
}

const loader = esm(module)
let synth = loader(args.argv.remain[0])
if (synth.default) {
  synth = synth.default
}

const noteParams = []
const ccLookup = {}

const synthParams = new Params(
  Object.keys(params).reduce((a, v) => {
    if (params[k] === 'note') {
      noteParams.push(k)
    } else {
      ccLookup[ params[k] ] = k
    }
    return { ...a, [v]: 0 }
  }, {})
)

if (Object.keys(params).length) {
  easymidi.getInputs().forEach((device) => {
    const i = new easymidi.Input(device)

    if (noteParams.length) {
      i.on('noteon', (m) => {
        const { _type, ...msg } = m
        msg.device = device
        msg.type = _type
        noteParams.forEach((name) => {
          params[name] = { ...msg }
        })
      })

      i.on('noteoff', (m) => {
        const { _type, ...msg } = m
        msg.device = device
        msg.type = _type
        noteParams.forEach((name) => {
          params[name] = { ...msg }
        })
      })
    }

    i.on('cc', (msg) => {
      if (ccLookup[msg.controller]) {
        params[ccLookup[msg.controller]] = msg.value
      }
    })

    return i
  })
}

play(synth, synthParams)