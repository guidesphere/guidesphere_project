// frontend/src/utils/progressAdapter.js
export function adaptLocalProgressToItems(uid, courseId, courseItems) {
  const key = `progress:${uid}:${courseId}`;
  const stored = JSON.parse(localStorage.getItem(key) || "{}");
  const metaVideos = stored.meta?.videos || {};
  const metaDocs   = stored.meta?.docs   || {};

  return courseItems.map(it => {
    const id = it.item_id; // usamos content_id
    let pct = 0;
    if (it.item_type === "video" && metaVideos[id] != null) pct = Number(metaVideos[id]);
    if (it.item_type === "document" && metaDocs[id]   != null) pct = Number(metaDocs[id]);
    return {
      ...it,
      progress_percent: Math.max(0, Math.min(100, pct))
    };
  });
}
