import { useEffect, useState } from 'react';
import { getSyllabus, updateSyllabus, deleteSyllabus } from '../services/syllabusService.js';
import { getErrorMessage } from '../services/api.js';

/**
 * Shows the full detail of one syllabus (units + topics), with simple
 * inline editing of the title and topic lists, and delete with
 * confirmation. Deliberately keeps editing lightweight — per-topic
 * text fields and add/remove buttons, no drag-and-drop reordering.
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
    setEditTitle(syllabus.title || '');
    setEditUnits((syllabus.units || []).map((u) => ({ ...u, topics: [...u.topics] })));
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
    <div className="rounded-xl border border-gray-200 bg-white p-6 mt-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-navy">Syllabus Details</h3>
        <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600">
          Close
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading syllabus…</p>}
      {loadError && <p className="text-sm text-red-600">{loadError}</p>}

      {!loading && !loadError && syllabus && (
        <div>
          {/* Title */}
          <div className="mb-6">
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green/40"
              />
            ) : (
              <h4 className="text-xl font-semibold text-navy">{syllabus.title}</h4>
            )}
            <p className="text-xs text-gray-400 mt-1">
              File: {syllabus.originalFileName} · Status: {syllabus.status}
              {syllabus.createdAt && ` · Uploaded ${new Date(syllabus.createdAt).toLocaleDateString()}`}
            </p>
          </div>

          {/* Units + topics */}
          <div className="space-y-4">
            {editUnits.map((unit, unitIndex) => (
              <div key={unit.unitNumber ?? unitIndex} className="rounded-lg border border-gray-100 p-4 bg-mint/30">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-green bg-white px-2 py-0.5 rounded-full border border-green/20">
                    Unit {unit.unitNumber}
                  </span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={unit.title}
                      onChange={(e) => updateUnitTitle(unitIndex, e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green/40"
                    />
                  ) : (
                    <span className="font-medium text-navy text-sm">{unit.title}</span>
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
                          className="flex-1 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green/40"
                        />
                        <button
                          onClick={() => removeTopic(unitIndex, topicIndex)}
                          className="text-xs text-red-500 hover:text-red-700"
                          aria-label={`Remove topic ${topic}`}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addTopic(unitIndex)}
                      className="text-xs font-medium text-green hover:underline"
                    >
                      + Add topic
                    </button>
                  </div>
                ) : unit.topics.length > 0 ? (
                  <ul className="flex flex-wrap gap-2">
                    {unit.topics.map((topic, topicIndex) => (
                      <li
                        key={topicIndex}
                        className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1 text-navy"
                      >
                        {topic}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-400 italic">No topics extracted for this unit.</p>
                )}
              </div>
            ))}
            {editUnits.length === 0 && <p className="text-sm text-gray-400">No units were extracted.</p>}
          </div>

          {saveError && <p className="text-sm text-red-600 mt-4">{saveError}</p>}

          {/* Actions */}
          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-green text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  onClick={cancelEditing}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={startEditing}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-navy hover:bg-gray-50"
              >
                Edit
              </button>
            )}

            <div className="flex-1" />

            {confirmingDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Delete this syllabus?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Deleting…' : 'Confirm Delete'}
                </button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Delete Syllabus
              </button>
            )}
          </div>
          {deleteError && <p className="text-sm text-red-600 mt-2">{deleteError}</p>}
        </div>
      )}
    </div>
  );
}

export default SyllabusDetail;
