const SKILL_RANK = { beginner: 0, intermediate: 1, advanced: 2 }

/**
 * Filter exercises for a given phase/day context against a client profile.
 * Returns scored + sorted array.
 */
export function filterExercises(allExercises, { phase, patterns = [], client }) {
  const clientSkillRank = SKILL_RANK[client.experience] ?? 0
  const available = new Set(client.equipment_available || [])
  const injuries = new Set([
    ...(client.injuries || []),
    ...(client.medical_flags || []),
  ])

  const results = allExercises.filter(ex => {
    // 1. Phase match
    if (!ex.phases.includes(phase)) return false

    // 2. Pattern match — if patterns specified, at least one must overlap
    if (patterns.length > 0 && !patterns.some(p => ex.patterns.includes(p))) return false

    // 3. Equipment: at least one piece available
    if (!ex.equipment.some(eq => available.has(eq))) return false

    // 4. Skill ceiling: no skill above client level
    const maxSkill = Math.max(...ex.skill_level.map(s => SKILL_RANK[s] ?? 0))
    if (maxSkill > clientSkillRank) return false

    // 5. Contraindications: none triggered
    if (ex.contraindications.some(c => injuries.has(c))) return false

    return true
  })

  // Score and sort
  return results
    .map(ex => ({ ...ex, _score: scoreExercise(ex, client) }))
    .sort((a, b) => b._score - a._score)
}

function scoreExercise(ex, client) {
  let score = 0
  const likes = (client.likes || []).map(s => s.toLowerCase())
  const dislikes = (client.dislikes || []).map(s => s.toLowerCase())
  const nameLower = ex.name.toLowerCase()

  for (const tag of ex.tags) {
    if (likes.some(l => tag.includes(l) || l.includes(tag))) score += 2
    if (dislikes.some(d => tag.includes(d) || d.includes(tag))) score -= 3
  }
  if (likes.some(l => nameLower.includes(l))) score += 2
  if (dislikes.some(d => nameLower.includes(d))) score -= 5

  return score
}
