import { useState, useCallback } from 'react'

function getApiKey() {
  return localStorage.getItem('pb_api_key') || ''
}

async function callClaude(prompt, systemPrompt = '') {
  const key = getApiKey()
  if (!key) throw new Error('No API key. Add it in Settings.')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API error ${res.status}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text || ''
}

export function useAI() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const generateExerciseNotes = useCallback(async (exerciseName, client, phase) => {
    setLoading(true)
    setError(null)
    try {
      const systemPrompt = [
        'You are an expert strength coach trained in Dr. John Rusin\'s pain-free performance methodology.',
        'Generate concise coaching cue notes for exercises.',
        'Format: 2-4 short bullet points (no dashes, use bullet character).',
        'Focus on: technique cues, tempo, safety, common errors to avoid.',
        'Keep it under 80 words total. Plain text only.',
      ].join('\n')

      const injuryList = [...(client.injuries || []), ...(client.medical_flags || [])].join(', ') || 'none'
      const goalList = (client.goals || []).join(', ') || 'general'

      const prompt = [
        'Exercise: ' + exerciseName,
        'Phase: ' + phase,
        'Client experience: ' + (client.experience || 'beginner'),
        'Injuries/flags: ' + injuryList,
        'Goals: ' + goalList,
        '',
        'Generate concise coaching cues.',
      ].join('\n')

      const text = await callClaude(prompt, systemPrompt)
      return text.trim()
    } catch (e) {
      setError(e.message)
      return ''
    } finally {
      setLoading(false)
    }
  }, [])

  const qualityCheck = useCallback(async (program, client) => {
    setLoading(true)
    setError(null)
    try {
      const systemPrompt = [
        'You are an expert strength coach trained in Dr. John Rusin\'s pain-free performance methodology.',
        'Review training programs for quality, balance, and safety.',
        'Be direct and specific. Flag real issues only.',
        'Format your response as numbered points. Max 300 words.',
      ].join('\n')

      const exerciseList = program.flatMap(day =>
        day.phases.flatMap(ph =>
          ph.exercises
            .filter(ex => ex.exerciseName)
            .map(ex => day.title + ' / ' + ph.phase + ': ' + ex.exerciseName)
        )
      ).join('\n')

      const injuryList = [...(client.injuries || []), ...(client.medical_flags || [])].join(', ') || 'none'

      const prompt = [
        'Client profile:',
        '- Experience: ' + client.experience,
        '- Goals: ' + (client.goals || []).join(', '),
        '- Injuries: ' + injuryList,
        '- Sessions/week: ' + client.sessions_per_week,
        '',
        'Program exercises:',
        exerciseList,
        '',
        'Assess this program against Rusin\'s methodology. Flag any imbalances, injury risks, or missing elements. Suggest specific changes.',
      ].join('\n')

      const text = await callClaude(prompt, systemPrompt)
      return text.trim()
    } catch (e) {
      setError(e.message)
      return ''
    } finally {
      setLoading(false)
    }
  }, [])

  const tagExercise = useCallback(async (exerciseName) => {
    setLoading(true)
    setError(null)
    try {
      const systemPrompt = [
        'You are a fitness database assistant. Tag exercises using ONLY the allowed taxonomy values below.',
        'Return ONLY valid JSON - no markdown, no explanation.',
        '',
        'ALLOWED VALUES:',
        'patterns: squat, lunge, hinge, push, pull, carry, core, rotation, explosive, locomotion, conditioning',
        'phases: warmup, activation, primer, kpi, accessory, finisher, cooldown',
        'equipment: barbell, dumbbell, cable, machine, kettlebell, bodyweight, band, landmine, medicine_ball, pull_up_bar, powerbag, rowing_machine, assault_bike, assault_treadmill, back_extension_bench, leg_press_machine, battle_ropes, foam_roller, sled',
        'intensity: low, moderate, high',
        'skill_level: beginner, intermediate, advanced',
        'spine_load: low, moderate, high (ONE value only - string, not array)',
        'joint_stress: spine_friendly, spine_load, knee_friendly, knee_load, shoulder_friendly, shoulder_load, elbow_load, wrist_load, hip_load',
        'contraindications: knee_pain, low_back_pain, shoulder_pain, elbow_pain, wrist_pain, avoid_overhead, avoid_spinal_flexion, avoid_deep_knee_flexion, avoid_knee_valgus, hypermobility, balance_deficit, avoid_instability',
        'goals: hypertrophy, strength, fat_loss, mobility, stability, conditioning, health, explosive_power',
        'tags: quads, hamstrings, glutes, lower_back, upper_back, lats, chest, shoulders, biceps, triceps, core, calves, adductors, abductors, posterior_chain, patterning, shoulder_health, balance, full_body, rear_delts',
        'unilateral: true or false',
      ].join('\n')

      const prompt = [
        'Tag this exercise: "' + exerciseName + '"',
        '',
        'Return a JSON object with these exact fields:',
        'name, patterns, phases, intensity, equipment, skill_level, spine_load, joint_stress, contraindications, goals, tags, unilateral, regression, progression',
        '',
        'For regression and progression, use snake_case exercise names.',
      ].join('\n')

      const text = await callClaude(prompt, systemPrompt)
      const clean = text.replace(/```json|```/g, '').trim()
      return JSON.parse(clean)
    } catch (e) {
      setError(e.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])


  const smartFill = useCallback(async (program, client, allExercises, dayIndex) => {
    setLoading(true)
    setError(null)
    try {
      // ── Step 1: Determine archetype ─────────────────────────────────────
      const injuries = [...(client.injuries || []), ...(client.medical_flags || [])]
      const goals = client.goals || []
      const exp = client.experience || 'beginner'

      let archetype = 'Minimalist Strength'
      if (exp === 'beginner') {
        archetype = 'Absolute Beginner'
      } else if (injuries.includes('hypermobility') || injuries.length >= 3) {
        archetype = 'Rehab-Forward'
      } else if ((client.age >= 50) && (goals.includes('health') || goals.includes('mobility'))) {
        archetype = 'Longevity'
      } else if (goals.includes('fat_loss') && goals.includes('conditioning')) {
        archetype = 'Fat Loss'
      } else if (goals.includes('strength') && goals.includes('conditioning')) {
        archetype = 'Strength + Conditioning'
      } else if (goals.includes('strength')) {
        archetype = 'Minimalist Strength'
      } else if (goals.includes('hypertrophy')) {
        archetype = 'Minimalist Strength'
      }

      // ── Step 2: Determine High/Low day ──────────────────────────────────
      const totalDays = program.length
      let dayType = 'HIGH'
      if (totalDays === 2) {
        dayType = dayIndex === 0 ? 'HIGH' : 'LOW'
      } else if (totalDays === 3) {
        dayType = dayIndex === 1 ? 'LOW' : 'HIGH'
      } else if (totalDays === 4) {
        dayType = dayIndex % 2 === 0 ? 'HIGH' : 'LOW'
      }

      // ── Step 3: Build exercise list (names only, no filtering) ──────────
      const exerciseNames = allExercises.map(ex => ex.name).join(', ')

      // ── Step 4: Build system prompt ─────────────────────────────────────
      const systemPrompt = [
        'You are an expert strength and conditioning coach. You create training programs using Dr. John Rusin Pain-Free Performance methodology combined with evidence-based programming principles.',
        '',
        '=== RUSIN PHASE STRUCTURE ===',
        'Every session has exactly these phases in order:',
        '1. WARMUP: Soft tissue + dynamic movement prep. 3 exercises.',
        '2. ACTIVATION: Targeted glute/lat/corrective work. 2-3 exercises.',
        '3. PRIMER: Movement-specific prep for KPI.',
        '   - Mechanical: 1 exercise matching KPI pattern at low load',
        '   - Neurological: 1 explosive/CNS exercise (jump, throw, bound) matching day pattern',
        '4. KPI: Primary compound movement(s). The heart of the session.',
        '   - HIGH day: 1-2 heavy compounds',
        '   - LOW day: 1 technique lift at reduced load',
        '5. ACCESSORY: Antagonist superset pairs.',
        '   - A1 + A2: first pair (opposing patterns)',
        '   - B1 + B2: second pair (opposing patterns)',
        '   - HIGH day: 4 exercises total',
        '   - LOW day: 2 exercises (1 pair only)',
        '6. FINISHER: 1 conditioning piece.',
        '   - HIGH day: loaded carry or metabolic circuit',
        '   - LOW day: steady cardio or flow work',
        '7. COOLDOWN: 2-3 recovery exercises (stretches, breathing, foam rolling)',
        '',
        '=== ARCHETYPES & REP SCHEMES ===',
        'Absolute Beginner: KPI 2-3x10-12, Accessory 2x12-15, 90s rest. Focus on technique.',
        'Rehab-Forward: KPI 2-3x10-15, Accessory 2x10-12, 90-120s rest. Conservative loads, avoid pain triggers.',
        'Longevity: KPI 2-3x8-12, Accessory 2x10-12, 60-90s rest. Low joint stress, mobility emphasis.',
        'Fat Loss: KPI 3-4x8-12, Accessory 3x12-15, 30-60s rest. Higher density, minimal rest.',
        'Strength + Conditioning: KPI 3-4x5-8, Accessory 3x8-12, 60-120s rest. Compounds + metabolic.',
        'Minimalist Strength: KPI 4-5x4-6, Accessory 2-3x8-12, 90-120s rest. Load progression focus.',
        '',
        '=== HIGH vs LOW DAY ===',
        'HIGH day: Heavy KPI, strength focus, opposing accessory supersets, metabolic finisher.',
        'LOW day: Technique KPI at 60% load, core focus, one accessory pair, steady conditioning.',
        '',
        '=== INJURY RULES ===',
        'knee_pain: Avoid deep knee flexion, heavy squats. Prefer hip-dominant and upper body.',
        'low_back_pain: Avoid heavy spinal loading. Prefer hip hinge with light load, core stability.',
        'shoulder_pain: Avoid overhead pressing. Prefer horizontal push/pull, rotator cuff work.',
        'wrist_pain: Avoid load through wrist. Prefer neutral grip, carries, lower body focus.',
        'elbow_pain: Avoid heavy curls/triceps. Light loads, wrist-neutral grips.',
        'hypermobility: No end-range stretching. Prioritize stability, control, isometrics.',
        '',
        '=== OUTPUT FORMAT ===',
        'Return ONLY valid JSON. No markdown, no explanation.',
        'Format:',
        '{',
        '  "archetype": "string",',
        '  "dayType": "HIGH or LOW",',
        '  "suggestedPatterns": ["push", "squat"],',
        '  "phases": {',
        '    "warmup": [',
        '      {"exerciseName": "...", "sets": "1", "reps": "60s", "notes": "..."}',
        '    ],',
        '    "activation": [...],',
        '    "primer": [...],',
        '    "kpi": [...],',
        '    "accessory": [',
        '      {"exerciseName": "...", "sets": "3", "reps": "12", "notes": "...", "supersetGroup": "A1"},',
        '      {"exerciseName": "...", "sets": "3", "reps": "12", "notes": "...", "supersetGroup": "A2"},',
        '      {"exerciseName": "...", "sets": "3", "reps": "12", "notes": "...", "supersetGroup": "B1"},',
        '      {"exerciseName": "...", "sets": "3", "reps": "12", "notes": "...", "supersetGroup": "B2"}',
        '    ],',
        '    "finisher": [...],',
        '    "cooldown": [...]',
        '  }',
        '}',
      ].join('\n')

      // ── Step 5: Build user prompt ───────────────────────────────────────
      const injuryList = injuries.map(i => i.replace(/_/g, ' ')).join(', ') || 'none'
      const goalList = goals.map(g => g.replace(/_/g, ' ')).join(', ') || 'general fitness'
      const equip = (client.equipment_available || []).slice(0, 10).join(', ') || 'full gym'
      const dayPatterns = (program[dayIndex]?.patterns || []).join(', ') || 'not specified'

      const prompt = [
        'Create a complete ' + dayType + ' day training session for this client:',
        '',
        'Client: ' + client.name,
        'Age: ' + (client.age || 'unknown'),
        'Sex: ' + (client.sex || 'unknown'),
        'Experience: ' + exp,
        'Goals: ' + goalList,
        'Specific goal: ' + (client.specific_goals || 'none'),
        'Injuries/flags: ' + injuryList,
        'Session duration: ' + (client.session_duration || 60) + ' minutes',
        'Equipment: ' + equip,
        '',
        'Auto-detected archetype: ' + archetype,
        'Day type: ' + dayType + ' (Day ' + (dayIndex + 1) + ' of ' + totalDays + ')',
        'Selected patterns for this day: ' + dayPatterns,
        '',
        'Available exercises (use names exactly as written, or suggest new ones if better):',
        exerciseNames,
        '',
        'Generate the complete session following the Rusin phase structure.',
        'Choose patterns that make sense for this day type and client.',
        'Apply the ' + archetype + ' rep/set scheme throughout.',
        'Respect all injury constraints.',
        'Write coaching notes that are specific and actionable (max 12 words each).',
      ].join('\n')

      const text = await callClaude(prompt, systemPrompt, 2000)
      const clean = text.replace(/```json|```/g, '').trim()
      const result = JSON.parse(clean)
      return result

    } catch (e) {
      setError('Smart Fill failed: ' + e.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { generateExerciseNotes, qualityCheck, tagExercise, smartFill, loading, error }
}