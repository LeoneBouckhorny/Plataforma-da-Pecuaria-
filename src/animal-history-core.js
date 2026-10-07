const AnimalHistoryCore = ((ref) => {
  const Events = ref || require("./animal-event-core.js");
  function buildHistory(animal, events, weighings) {
    const timeline = events.map((event) => ({ ...event, derived: false }));
    for (const { item, session } of weighings) {
      const date = session.weighingDate;
      const occurredAt = /^\d{4}-\d{2}-\d{2}$/.test(date || "") && Number.isFinite(Date.parse(`${date}T00:00:00Z`))
        ? `${date}T00:00:00.000Z` : session.createdAt;
      timeline.push({ id: `weighing:${item.id}`, type: "weighing", occurredAt, createdAt: session.createdAt,
        derived: true, item, session });
    }
    if (animal.birthDate) timeline.push({ id: `birth:${animal.id}`, type: "birth", occurredAt: `${animal.birthDate}T00:00:00.000Z`, derived: true });
    if (!events.some((event) => event.type === "registered") && animal.createdAt) timeline.push({
      id: `legacy:${animal.id}`, type: "legacy_registered", occurredAt: animal.createdAt, derived: true,
    });
    const ordered = Events.sortTimeline(timeline);
    const weights = ordered.filter((entry) => entry.type === "weighing");
    return { timeline: ordered, weighingCount: weights.length,
      lastWeight: weights[0]?.item.weightSnapshot ?? null, lastWeighingDate: weights[0]?.session.weighingDate || weights[0]?.session.createdAt || null };
  }
  return { buildHistory };
})(typeof window !== "undefined" ? window.AnimalEventCore : undefined);
if (typeof module !== "undefined") module.exports = AnimalHistoryCore;
if (typeof window !== "undefined") window.AnimalHistoryCore = AnimalHistoryCore;
