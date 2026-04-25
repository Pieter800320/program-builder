const SKILL_RANK = { beginner: 0, intermediate: 1, advanced: 2 }

// Opposing patterns for A2/B2 superset slots
const OPPOSING_PATTERNS = {
  push:        ['pull'],
  pull:        ['push'],
  squat:       ['hinge'],
  hinge:       ['squat'],
  lunge:       ['hinge', 'carry'],
  carry:       ['core', 'lunge'],
  core:        ['carry', 'rotation'],
  rotation:    ['core'],
  explosive:   ['conditioning'],
  conditioning:['explosive'],
  locomotion:  ['core'],
}

function getOpposing(patterns) {
  const result = new Set()
  patterns.forEach(p => {
    const opp = OPPOSING_PATTERNS[p] || []
    opp.forEach(o => result.add(o))
  })
  return [...result]
}

/**
 * Main filter function.
 *
 * Hard filters (always applied):
 *   1. Phase must match
 *   2. Contraindications must NOT be triggered (safety only)
 *
 * Soft filters (affect sort score only):
 *   - Pattern relevance (day patterns vs opposing for A2/B2)
 *   - Equipment preference
 *   - Skill match
 *   - Likes/dislikes
 *
 * Returns ALL exercises that pass hard filters, sorted by relevance score.
 */
export function filterExercises(allExercises, {
  phase,
  patterns = [],
  client,
  supersetGroup = null,   // 'A1','A2','B1','B2' or null
}) {
  const injuries = new Set([
    ...(client.injuries || []),
    ...(client.medical_flags || []),
  ])
  const preferred = new Set(client.equipment_available || [])
  const clientSkillRank = SKILL_RANK[client.experience] ?? 0
  const likes = (client.likes || []).map(s => s.toLowerCase())
  const dislikes = (client.dislikes || []).map(s => s.toLowerCase())

  // Determine target patterns for scoring
  const isOpposingSlot = supersetGroup === 'A2' || supersetGroup === 'B2'
  const targetPatterns = isOpposingSlot
    ? getOpposing(patterns.length > 0 ? patterns : ['push'])
    : patterns

  const results = allExercises
    .filter(ex => {
      // HARD FILTER 1: Phase must match
      if (!ex.phases.includes(phase)) return false

      // HARD FILTER 2: Contraindications (safety — never override)
      if (ex.contraindications.some(c => injuries.has(c))) return false

      return true
    })
    .map(ex => {
      let score = 0

      // Pattern relevance — primary sort driver
      if (targetPatterns.length > 0) {
        const patternMatches = ex.patterns.filter(p => targetPatterns.includes(p)).length
        score += patternMatches * 10
      }

      // Equipment preference — show client's equipment higher
      if (preferred.size > 0 && ex.equipment.some(eq => preferred.has(eq))) {
        score += 4
      }

      // Skill level match — preferred level scores higher but not hidden
      const maxSkill = Math.max(...ex.skill_level.map(s => SKILL_RANK[s] ?? 0))
      if (maxSkill === clientSkillRank) score += 3
      else if (maxSkill < clientSkillRank) score += 1
      // Above client level: score stays same (not penalized, just lower priority)

      // Likes/dislikes
      const nameLower = ex.name.toLowerCase()
      for (const tag of ex.tags) {
        if (likes.some(l => tag.includes(l) || l.includes(tag))) score += 2
        if (dislikes.some(d => tag.includes(d) || d.includes(tag))) score -= 3
      }
      if (likes.some(l => nameLower.includes(l))) score += 2
      if (dislikes.some(d => nameLower.includes(d))) score -= 5

      return { ...ex, _score: score }
    })
    .sort((a, b) => b._score - a._score)

  return results
}