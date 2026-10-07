const HerdHierarchyCore = (() => {
  function counts(animals) {
    const active = animals.filter((animal) => animal.status === "active");
    return { total: active.length, male: active.filter((animal) => animal.sex === "male").length,
      female: active.filter((animal) => animal.sex === "female").length,
      unknown: active.filter((animal) => animal.sex !== "male" && animal.sex !== "female").length };
  }
  function build(data, accountId, propertyId) {
    const scope = (items) => items.filter((item) => item.accountId === accountId && item.propertyId === propertyId);
    const paddocks = scope(data.paddocks); const lots = scope(data.lots); const animals = scope(data.animals);
    const lotNodes = lots.map((lot) => {
      const members = animals.filter((animal) => animal.lotId === lot.id);
      return { lot, animals: members, counts: counts(members) };
    });
    const branches = paddocks.map((paddock) => {
      const children = lotNodes.filter((node) => node.lot.paddockId === paddock.id);
      const active = children.filter((node) => node.lot.status === "active");
      return { paddock, lots: children, activeLots: active.length,
        activeAnimals: active.reduce((sum, node) => sum + node.counts.total, 0) };
    });
    return { paddocks: branches, lots: lotNodes,
      unassignedLots: lotNodes.filter((node) => !paddocks.some((p) => p.id === node.lot.paddockId)),
      unassignedAnimals: animals.filter((animal) => !lots.some((lot) => lot.id === animal.lotId)) };
  }
  return { counts, build };
})();
if (typeof module !== "undefined") module.exports = HerdHierarchyCore;
if (typeof window !== "undefined") window.HerdHierarchyCore = HerdHierarchyCore;
