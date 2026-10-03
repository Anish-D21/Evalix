import { useEffect, useState } from 'react';
import { getSyllabus, updateSyllabus, deleteSyllabus } from '../services/syllabusService.js';
import { getErrorMessage } from '../services/api.js';

/**
 * Shows the full detail of one syllabus (units + topics), with simple
 * inline editing of the title and topic lists, and delete with
 * confirmation.
 */
function SyllabusDetail({ syllabusId, onClose, onChanged }) {
  const [syllabus, setSyllabus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editUnits, setEditUnits] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');

    getSyllabus(syllabusId)
      .then((data) => {
        if (cancelled) return;
        setSyllabus(data);
        setEditTitle(data.title || '');
        setEditUnits((data.units || []).map((u) => ({ ...u, topics: [...u.topics] })));
      })
      .catch((err) => {
        if (!cancelled) setLoadError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [syllabusId]);

  function startEditing() {
    setSaveError('');
    setIsEditing(true);
  }

  function cancelEditing() {
    setEditTitle(syllabus?.title || '');
    setEditUnits((syllabus?.units || []).map((u) => ({ ...u, topics: [...u.topics] })));
    setSaveError('');
    setIsEditing(false);
  }

  function updateUnitTitle(unitIndex, value) {
    setEditUnits((prev) => prev.map((u, i) => (i === unitIndex ? { ...u, title: value } : u)));
  }

  function updateTopic(unitIndex, topicIndex, value) {
    setEditUnits((prev) =>
      prev.map((u, i) =>
        i === unitIndex ? { ...u, topics: u.topics.map((t, ti) => (ti === topicIndex ? value : t)) } : u
      )
    );
  }

  function removeTopic(unitIndex, topicIndex) {
    setEditUnits((prev) =>
      prev.map((u, i) => (i === unitIndex ? { ...u, topics: u.topics.filter((_, ti) => ti !== topicIndex) } : u))
    );
  }

  function addTopic(unitIndex) {
    setEditUnits((prev) => prev.map((u, i) => (i === unitIndex ? { ...u, topics: [...u.topics, ''] } : u)));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    try {
      const cleanedUnits = editUnits.map((u) => ({
        ...u,
        topics: u.topics.map((t) => t.trim()).filter(Boolean),
      }));
      const updated = await updateSyllabus(syllabusId, { title: editTitle.trim(), units: cleanedUnits });
      setSyllabus(updated);
      setEditUnits(updated.units.map((u) => ({ ...u, topics: [...u.topics] })));
      setIsEditing(false);
      onChanged?.();
    } catch (err) {
      setSaveError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteSyllabus(syllabusId);
      onChanged?.();
      onClose();
    } catch (err) {
      setDeleteError(getErrorMessage(err));
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-brand-charcoal/50 bg-white dark:bg-[#161F1F] p-6 mt-6 shadow-sm dark:shadow-card-dark transition-colors">
      <div className="flex items-start justify-between mb-4 pb-3 border-b border-gray-100 dark:border-brand-charcoal/40">
        <h3 className="text-lg font-semibold text-brand-carbon dark:text-brand-silk flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-ice" />
          Syllabus Details &amp; Topic Taxonomy
        </h3>
        <button
          onClick={onClose}
          className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-brand-charcoal/40 text-brand-granite dark:text-brand-silk hover:bg-gray-200 dark:hover:bg-brand-charcoal/70 transition-colors"
        >
          Close ✕
        </button>
      </div>

      {loading && (
        <div className="p-8 text-center text-xs text-brand-granite dark:text-brand-lilac/70">
          <svg className="animate-spin mx-auto h-5 w-5 text-brand-ice mb-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading syllabus details…
        </div>
      )}
      {loadError && <p className="text-sm text-red-500">{loadError}</p>}

      {!loading && !loadError && syllabus && (
        <div>
          {/* Title */}
          <div className="mb-6">
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full max-w-md border border-gray-300 dark:border-brand-charcoal bg-white dark:bg-[#131A1A] text-brand-carbon dark:text-brand-silk rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-lilac/40"
              />
            ) : (
              <h4 className="text-xl font-bold font-display text-brand-carbon dark:text-brand-silk">{syllabus.title}</h4>
            )}
            <p className="text-xs text-brand-granite dark:text-brand-lilac/70 mt-1">
              File: <span className="font-mono">{syllabus.originalFileName}</span> · Status: {syllabus.status}
              {syllabus.createdAt && ` · Uploaded ${new Date(syllabus.createdAt).toLocaleDateString()}`}
            </p>
          </div>

          {/* Units + topics */}
          <div className="space-y-4">
            {editUnits.map((unit, unitIndex) => (
              <div
                key={unit.unitNumber ?? unitIndex}
                className="rounded-xl border border-gray-100 dark:border-brand-charcoal/40 p-4 bg-brand-silk/15 dark:bg-[#131A1A]"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-charcoal text-white dark:bg-brand-charcoal/80 dark:text-brand-silk border border-brand-charcoal">
                    Unit {unit.unitNumber}
                  </span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={unit.title}
                      onChange={(e) => updateUnitTitle(unitIndex, e.target.value)}
                      className="flex-1 border border-gray-300 dark:border-brand-charcoal bg-white dark:bg-[#172121] text-brand-carbon dark:text-brand-silk rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-lilac/40"
                    />
                  ) : (
                    <span className="font-semibold text-brand-carbon dark:text-brand-silk text-sm">{unit.title}</span>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    {unit.topics.map((topic, topicIndex) => (
                      <div key={topicIndex} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={topic}
                          onChange={(e) => updateTopic(unitIndex, topicIndex, e.target.value)}
                          className="flex-1 border border-gray-300 dark:border-brand-charcoal bg-white dark:bg-[#172121] text-brand-carbon dark:text-brand-silk rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-lilac/40"
                        />
                        <button
                          onClick={() => removeTopic(unitIndex, topicIndex)}
                          className="text-xs text-red-500 hover:text-red-600 px-2 py-1"
                          aria-label={`Remove topic ${topic}`}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addTopic(unitIndex)}
                      className="text-xs font-semibold text-brand-charcoal dark:text-brand-ice hover:underline"
                    >
                      + Add topic
                    </button>
                  </div>
                ) : unit.topics.length > 0 ? (
                  <ul className="flex flex-wrap gap-2">
                    {unit.topics.map((topic, topicIndex) => (
                      <li
                        key={topicIndex}
                        className="text-xs bg-white dark:bg-brand-carbon border border-gray-200 dark:border-brand-charcoal/60 rounded-full px-3 py-1 text-brand-carbon dark:text-brand-silk shadow-sm"
                      >
                        {topic}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-brand-granite dark:text-brand-lilac/60 italic">No topics extracted for this unit.</p>
                )}
              </div>
            ))}
            {editUnits.length === 0 && <p className="text-sm text-brand-granite">No units were extracted.</p>}
          </div>

          {saveError && <p className="text-sm text-red-500 mt-4">{saveError}</p>}

          {/* Actions */}
          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-brand-charcoal/40 flex-wrap">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-brand-charcoal hover:bg-brand-carbon text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  onClick={cancelEditing}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-brand-charcoal text-xs font-semibold text-brand-granite dark:text-brand-silk hover:bg-gray-100 dark:hover:bg-brand-charcoal/40 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={startEditing}
                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-brand-charcoal text-xs font-semibold text-brand-carbon dark:text-brand-silk hover:bg-gray-50 dark:hover:bg-brand-charcoal/40 transition-colors"
              >
                Edit Topics
              </button>
            )}

            <div className="flex-1" />

            {confirmingDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-brand-granite dark:text-brand-lilac">Delete this syllabus?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Deleting…' : 'Confirm Delete'}
                </button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-brand-charcoal text-xs font-medium text-brand-granite hover:bg-gray-50 dark:hover:bg-brand-charcoal/30"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                Delete Syllabus
              </button>
            )}
          </div>
          {deleteError && <p className="text-xs text-red-500 mt-2">{deleteError}</p>}
        </div>
      )}
    </div>
  );
}

export default SyllabusDetail;
