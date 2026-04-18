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
      max_tokens: 1000,
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

  /**
   * Generate coaching cue notes for a single exercise.
   */
  const generateExerciseNotes = useCallback(async (exerciseName, client, phase) => {
    setLoading(true)
    setError(null)
    try {
      const systemPrompt = `You are an expert strength coach trained in Dr. John Rusin's pain-free performance methodology. 
Generate concise coaching cue notes for exercises. 
Format: 2–4 short bullet points (no dashes, use •). 
Focus on: technique cues, tempo, safety, common errors to avoid.
Keep it under 80 words total. Plain text only.`

      const prompt = `Exercise: ${exerciseName}
Phase: ${phase}
Client experience: ${client.experience || 'beginner'}
Injuries/flags: ${[...(client.injuries || []), ...(client.medical_flags || [])].join(', ') || 'none'}
Goals: ${(client.goals || []).join(', ') || 'general'}

Generate concise coaching cues.`

      const text = await callClaude(prompt, systemPrompt)
      return text.trim()
    } catch (e) {
      setError(e.message)
      return ''
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Run a Rusin methodology quality check on the full program.
   */
  const qualityCheck = useCallback(async (program, client) => {
    setLoading(true)
    setError(null)
    try {
      const systemPrompt = `You are an expert strength coach trained in Dr. John Rusin's pain-free performance methodology.
Review training programs for quality, balance, and safety. 
Be direct and specific. Flag real issues only — not minor stylistic preferences.
Format your response as numbered points. Max 300 words.`

      const exerciseList = program.flatMap(day =>
        day.phases.flatMap(ph =>
          ph.exercises
            .filter(ex => ex.exerciseName)
            .map(ex => `${day.title} / ${ph.phase}: ${ex.exerciseName}`)
        )
      ).join('\n')

      const prompt = `Client profile:
- Experience: ${client.experience}
- Goals: ${(client.goals || []).join(', ')}
- Injuries: ${[...(client.injuries || []), ...(client.medical_flags || [])].join(', ') || 'none'}
- Sessions/week: ${client.sessions_per_week}

Program exercises:
${exerciseList}

Assess this program against Rusin's methodology. Flag any imbalances, injury risks, or missing elements. Suggest specific changes.`

      const text = await callClaude(prompt, systemPrompt)
      return text.trim()
    } catch (e) {
      setError(e.message)
      return ''
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Auto-tag a new exercise against the taxonomy.
   */
  const tagExercise = useCallback(async (exerciseName) => {
    setLoading(true)
    setError(null)
    try {
      const systemPrompt = `You are a fitness database assistant. Tag exercises using ONLY the allowed taxonomy values below.
Return ONLY valid JSON — no markdown, no explanation.

ALLOWED VALUES:
patterns: squat, lunge, hinge, push, pull, carry, core, rotation, explosive, locomotion, conditioning
phases: warmup, activation, primer, kpi, accessory, finisher, cooldown
equipment: barbell, dumbbell, cable, machine, kettlebell, bodyweight, band, landmine, medicine_ball, pull_up_bar, powerbag, rowing_machine, assault_bike, assault_treadmill, back_extension_bench, leg_press_machine
intensity: low, moderate, high
skill_level: beginner, intermediate, advanced
spine_load: low, moderate, high (ONE value only — string, not array)
joint_stress: spine_friendly, spine_load, knee_friendly, knee_load, shoulder_friendly, shoulder_load, elbow_load, wrist_load, hip_load
contraindications: knee_pain, low_back_pain, shoulder_pain, elbow_pain, wrist_pain, avoid_overhead, avoid_spinal_flexion, avoid_deep_knee_flexion, avoid_knee_valgus, hypermobility, balance_deficit, avoid_instability
goals: hypertrophy, strength, fat_loss, mobility, stability, conditioning, health, explosive_power
tags: quads, hamstrings, glutes, lower_back, upper_back, lats, chest, shoulders, biceps, triceps, core, calves, adductors, abductors, posterior_chain, patterning, shoulder_health, balance, full_body, rear_delts
unilateral: true or false`

      const prompt = `Tag this exercise: "${exerciseName}"

Return a JSON object with these exact fields:
name, patterns, phases, intensity, equipment, skill_level, spine_load, joint_stress, contraindications, goals, tags, unilateral, regression, progression

For regression and progression, use snake_case exercise names.`

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

  return { generateExerciseNotes, qualityCheck, tagExercise, loading, error }
}
