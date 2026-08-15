# Skill: Roadmap Day-Level Content

Read this before touching the roadmap seed data or `/roadmap/today`. This fixes the core issue: the current schema only has one topic per **week**, so all 5 weekdays show identical content. This file defines the corrected schema and gives one fully worked week as the template.

## Important — this is a content problem, not just a code problem

The agent's job in Phase 14 is to implement the **data structure and the UI to consume it** — not to invent the day-by-day curriculum itself. Curriculum content should be authored by a human (or requested from Claude in a separate conversation) and reviewed before being trusted, the same way you wouldn't want an agent guessing what HTML topics matter most. Only Phase 1 Week 1 is fully worked out below as the required template — the remaining ~59 weeks need the same treatment before they're wired in. Flag this clearly in `progress.md` rather than letting the agent fabricate placeholder day content and pass it off as final.

## Corrected Schema

```
roadmap.phases[].weeks[] = {
  weekNumber,
  topic,          // overall week theme (kept, used in header)
  resources: [...],
  project,
  dsaFocus,
  days: [          // NEW — one entry per weekday, Mon–Fri
    {
      dayOfWeek: "Mon" | "Tue" | "Wed" | "Thu" | "Fri",
      task: String,          // the specific thing for THIS day
      resourceRef: String    // which resource/section/timestamp this maps to
    }
  ]
}
```

`GET /roadmap/today` resolves `dayOfWeek` from the current date and returns that day's specific `task`, not the whole week's `topic`, for the Block 1/2 session labels. Weekend blocks (Sat/Sun) keep using the fixed category labels already defined in `dailyBlocks` (Topic review, DSA review, Bug fixes, Weekly planning etc.) — those don't need day-splitting since Saturday/Sunday structure is already distinct from each other.

## Worked Example — Phase 1, Week 1 (HTML)

```json
{
  "weekNumber": 1,
  "topic": "HTML — structure, semantic tags, forms",
  "days": [
    { "dayOfWeek": "Mon", "task": "HTML document structure & basic tags (html, head, body, headings, paragraphs)" },
    { "dayOfWeek": "Tue", "task": "Semantic tags (header, nav, main, section, article, footer)" },
    { "dayOfWeek": "Wed", "task": "Lists, links, images, and tables" },
    { "dayOfWeek": "Thu", "task": "Forms — input types, labels, basic validation attributes" },
    { "dayOfWeek": "Fri", "task": "Practice day — rebuild a simple page from scratch using everything this week, no reference" }
  ]
}
```

This is the granularity every week needs: each day is a distinct, checkable sub-skill that builds toward that week's project — not a repeat of the week's overall theme.

## What To Do Next

1. Implement the schema change and the resolution logic in `/roadmap/today`.
2. Update the Today screen to display `day.task` instead of `week.topic` for the learning blocks.
3. For all remaining weeks beyond Phase 1 Week 1: leave `days` empty or clearly marked `"needsContent": true` in the seed data rather than inventing placeholder tasks. Surface this in `progress.md` under Phase 14 as a blocking item until the actual content is written.