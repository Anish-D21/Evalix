import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import {
  generateRubric,
  listRubrics,
  getRubric,
  updateRubric,
  approveRubric,
  deleteRubric,
} from '../services/rubricService.js';
import { listQuestions } from '../services/questionService.js';
import { getErrorMessage } from '../services/api.js';

const IMPORTANCE_LEVELS = ['critical', 'high', 'medium', 'low'];

function Rubric() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // URL Query pre-fill
  const queryQuestionId = searchParams.get('questionId') || '';
  const queryMarks = searchParams.get('marks') ? Number(searchParams.get('marks')) : 5;
  const queryText = searchParams.get('text') ? decodeURIComponent(searchParams.get('text')) : '';

  // Questions for dropdown selection
  const [questions, setQuestions] = useState([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState(queryQuestionId);

  // Rubric generation form
  const [referenceAnswer, setReferenceAnswer] = useState('');
  const [totalMarks, setTotalMarks] = useState(queryMarks || 10);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');

  // Active rubric being reviewed/edited
  const [activeRubric, setActiveRubric] = useState(null);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Saved rubrics list
  const [savedRubrics, setSavedRubrics] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  // New concept modal/inline form
  const [newConcept, setNewConcept] = useState({
    name: '',
    description: '',
    marks: 1,
    importance: 'medium',
    acceptablePhrases: '',
  });
  const [showAddConcept, setShowAddConcept] = useState(false);

  // New relationship inline form
  const [newRelationship, setNewRelationship] = useState({
    sourceConcept: '',
    relationship: 'uses',
    targetConcept: '',
    importance: 'medium',
    marks: 0,
  });
  const [showAddRelationship, setShowAddRelationship] = useState(false);

  function loadRubricsList() {
    setLoadingList(true);
    listRubrics()
      .then((data) => setSavedRubrics(data || []))
      .catch(() => {})
      .finally(() => setLoadingList(false));
  }

  useEffect(() => {
    loadRubricsList();
    listQuestions()
      .then((data) => setQuestions(data || []))
      .catch(() => {});
  }, []);

  // When question is selected from dropdown, update marks and reference
  function handleSelectQuestion(qId) {
    setSelectedQuestionId(qId);
    const q = questions.find((item) => item._id === qId);
    if (q) {
      if (q.marks) setTotalMarks(q.marks);
    }
  }

  async function handleGenerate(e) {
    e.preventDefault();
    if (!referenceAnswer.trim()) {
      setGenerateError('Please provide a descriptive reference answer.');
      return;
    }
    setGenerating(true);
    setGenerateError('');
    setActionError('');
    setActionSuccess('');

    try {
      const result = await generateRubric({
        referenceAnswer: referenceAnswer.trim(),
        totalMarks: Number(totalMarks),
        questionId: selectedQuestionId || undefined,
      });

      setActiveRubric(result.rubric);
      setActionSuccess('Candidate rubric generated successfully! Review the extracted concepts below.');
      await loadRubricsList();
    } catch (err) {
      setGenerateError(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  }

  async function handleSelectSavedRubric(id) {
    setActionError('');
    setActionSuccess('');
    try {
      const data = await getRubric(id);
      setActiveRubric(data);
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  }

  // Concept manipulation
  function updateConcept(index, field, value) {
    if (!activeRubric) return;
    const updatedConcepts = [...activeRubric.concepts];
    updatedConcepts[index] = {
      ...updatedConcepts[index],
      [field]: field === 'marks' ? Number(value) : value,
    };
    setActiveRubric({ ...activeRubric, concepts: updatedConcepts });
  }

  function removeConcept(index) {
    if (!activeRubric) return;
    const updatedConcepts = activeRubric.concepts.filter((_, i) => i !== index);
    setActiveRubric({ ...activeRubric, concepts: updatedConcepts });
  }

  function handleAddConcept() {
    if (!newConcept.name.trim()) return;
    const phrases = newConcept.acceptablePhrases
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const conceptObj = {
      id: newConcept.name.toLowerCase().replace(/\s+/g, '_'),
      name: newConcept.name.trim(),
      description: newConcept.description.trim(),
      marks: Number(newConcept.marks) || 1,
      importance: newConcept.importance,
      acceptablePhrases: phrases.length > 0 ? phrases : [newConcept.name.trim()],
    };

    setActiveRubric({
      ...activeRubric,
      concepts: [...(activeRubric.concepts || []), conceptObj],
    });

    setNewConcept({
      name: '',
      description: '',
      marks: 1,
      importance: 'medium',
      acceptablePhrases: '',
    });
    setShowAddConcept(false);
  }

  // Relationship manipulation
  function removeRelationship(index) {
    if (!activeRubric) return;
    const updated = activeRubric.relationships.filter((_, i) => i !== index);
    setActiveRubric({ ...activeRubric, relationships: updated });
  }

  function handleAddRelationship() {
    if (!newRelationship.sourceConcept || !newRelationship.targetConcept) return;
    const relObj = {
      sourceConcept: newRelationship.sourceConcept.trim(),
      relationship: newRelationship.relationship.trim(),
      targetConcept: newRelationship.targetConcept.trim(),
      importance: newRelationship.importance,
      marks: Number(newRelationship.marks) || 0,
    };

    setActiveRubric({
      ...activeRubric,
      relationships: [...(activeRubric.relationships || []), relObj],
    });

    setNewRelationship({
      sourceConcept: '',
      relationship: 'uses',
      targetConcept: '',
      importance: 'medium',
      marks: 0,
    });
    setShowAddRelationship(false);
  }

  // Save changes to DB
  async function handleSaveRubric() {
    if (!activeRubric) return;
    setSaving(true);
    setActionError('');
    setActionSuccess('');
    try {
      const updated = await updateRubric(activeRubric._id, {
        totalMarks: Number(activeRubric.totalMarks),
        concepts: activeRubric.concepts,
        relationships: activeRubric.relationships,
      });
      setActiveRubric(updated);
      setActionSuccess('Rubric changes saved successfully.');
      await loadRubricsList();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  // Approve Rubric
  async function handleApproveRubric() {
    if (!activeRubric) return;
    setApproving(true);
    setActionError('');
    setActionSuccess('');
    try {
      const approved = await approveRubric(activeRubric._id);
      setActiveRubric(approved);
      setActionSuccess('Rubric approved! It is now the official ground truth for answer evaluation.');
      await loadRubricsList();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setApproving(false);
    }
  }

  async function handleDeleteRubric(id) {
    if (!window.confirm('Delete this rubric?')) return;
    try {
      await deleteRubric(id);
      if (activeRubric?._id === id) setActiveRubric(null);
      await loadRubricsList();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  }

  // Balance calculation
  const conceptsSum = (activeRubric?.concepts || []).reduce((s, c) => s + (Number(c.marks) || 0), 0);
  const isMarksBalanced = activeRubric
    ? Math.abs(conceptsSum - Number(activeRubric.totalMarks)) < 0.01
    : false;

  return (
    <div>
      <PageHeader
        title="Evaluation Rubric Builder"
        description="Extract structured educational concepts and explicit relationships from a teacher's reference answer. The approved rubric serves as the immutable ground truth for semantic evaluation."
        badge="Phase 8 Step 3"
      />

      {/* Linked question banner if arriving with query */}
      {queryText && (
        <div className="mb-6 p-4 rounded-xl bg-pink/60 border border-pink-dark/30 flex items-start gap-3 text-navy">
          <div className="w-5 h-5 rounded-full bg-yellow text-navy font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
            Q
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Creating Rubric For Question:</span>
            <p className="text-sm font-semibold mt-0.5">{queryText}</p>
            <p className="text-xs text-gray-500 mt-1">Allocated Marks: {queryMarks}</p>
          </div>
        </div>
      )}

      {actionError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} className="text-xs font-semibold text-red-500 hover:text-red-800">
            Dismiss
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-mint border border-green/20 text-sm text-green font-medium flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess('')} className="text-xs font-semibold text-green hover:underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Generator & Saved Rubrics */}
        <div className="lg:col-span-5 space-y-6">
          {/* Generation Card */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6">
            <h3 className="text-base font-semibold text-navy flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
              <span className="w-2.5 h-2.5 rounded-full bg-green" />
              Generate Rubric from Reference
            </h3>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Associate with Question (Optional)
                </label>
                <select
                  value={selectedQuestionId}
                  onChange={(e) => handleSelectQuestion(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-green/30 bg-slate-50/50"
                >
                  <option value="">Select question from Question Bank…</option>
                  {questions.map((q) => (
                    <option key={q._id} value={q._id}>
                      [{q.topicName}] {q.text?.slice(0, 50)}… ({q.marks}m)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Teacher Reference Answer <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={5}
                  value={referenceAnswer}
                  onChange={(e) => setReferenceAnswer(e.target.value)}
                  placeholder="Paste the model or reference answer here. The NLP engine will identify discrete conceptual entities, acceptable phrases, and semantic relationships..."
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-green/30"
                />
                <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                  <span>Enter complete conceptual definition</span>
                  <span>{referenceAnswer.trim().split(/\s+/).filter(Boolean).length} words</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Total Question Marks
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green/30"
                />
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full py-2.5 rounded-xl bg-green hover:bg-green-dark text-white text-sm font-semibold shadow-md shadow-green/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Extracting Candidate Concepts…
                  </>
                ) : (
                  'Generate Candidate Rubric'
                )}
              </button>

              {generateError && <p className="text-xs text-red-600 font-medium">{generateError}</p>}
            </form>
          </div>

          {/* Saved Rubrics Selector Card */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-navy mb-3 pb-2 border-b border-gray-100 flex items-center justify-between">
              <span>Saved Rubrics Library</span>
              <span className="text-xs font-normal text-gray-400">{savedRubrics.length} total</span>
            </h3>

            {loadingList && <p className="text-xs text-gray-400">Loading rubrics…</p>}

            {!loadingList && savedRubrics.length === 0 && (
              <p className="text-xs text-gray-400 italic">No rubrics created yet. Generate one above.</p>
            )}

            {!loadingList && savedRubrics.length > 0 && (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {savedRubrics.map((r) => {
                  const isCurrent = activeRubric?._id === r._id;
                  return (
                    <div
                      key={r._id}
                      onClick={() => handleSelectSavedRubric(r._id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        isCurrent
                          ? 'border-green bg-mint/40 shadow-sm'
                          : 'border-gray-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold text-navy">
                        <span>{r.concepts?.length || 0} Concepts · {r.totalMarks} Marks</span>
                        {r.approved ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-mint text-green font-bold border border-green/30">
                            Approved
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow/20 text-amber-800">
                            Draft
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1 truncate">
                        Concepts: {r.concepts?.map((c) => c.name).join(', ') || 'None'}
                      </div>
                      <div className="flex justify-between items-center mt-2 text-[10px] text-gray-400">
                        <span>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRubric(r._id);
                          }}
                          className="text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Rubric Editor & Concept Review */}
        <div className="lg:col-span-7">
          {!activeRubric ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-mint flex items-center justify-center mx-auto mb-3 text-green">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h4 className="text-base font-semibold text-navy">No Active Rubric Selected</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Generate a new rubric from a reference answer or pick an existing rubric from the saved library to review and edit.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 space-y-6">
              {/* Header with Balance Tracker */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold font-display text-navy">
                      Rubric Concepts ({activeRubric.concepts?.length || 0})
                    </h3>
                    {activeRubric.approved ? (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-mint text-green border border-green/30">
                        Approved Ground Truth
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-yellow/20 text-amber-800 border border-yellow/40">
                        Draft Rubric
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Each concept will be evaluated against student answers using semantic embeddings.
                  </p>
                </div>

                {/* Marks Balance Indicator */}
                <div
                  className={`px-4 py-2 rounded-xl border text-right ${
                    isMarksBalanced
                      ? 'bg-mint/40 border-green/30 text-green'
                      : 'bg-yellow/20 border-yellow/40 text-amber-900'
                  }`}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wider">Marks Balance</div>
                  <div className="text-sm font-bold mt-0.5">
                    {conceptsSum.toFixed(1)} / {activeRubric.totalMarks} Marks
                  </div>
                  <div className="text-[10px] mt-0.5">
                    {isMarksBalanced ? '✓ Marks Balanced' : '⚠ Must equal totalMarks'}
                  </div>
                </div>
              </div>

              {/* Overlap warnings banner */}
              {activeRubric.overlapWarnings?.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <span>⚠</span> Concept Overlap Warnings (Prevent Double-Counting):
                  </div>
                  {activeRubric.overlapWarnings.map((w, idx) => (
                    <div key={idx} className="pl-4">• {w}</div>
                  ))}
                </div>
              )}

              {/* Concepts List */}
              <div className="space-y-4">
                {(activeRubric.concepts || []).map((concept, idx) => (
                  <div
                    key={concept.id || idx}
                    className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 bg-slate-50/40 space-y-3 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="w-5 h-5 rounded-full bg-navy text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={concept.name}
                          onChange={(e) => updateConcept(idx, 'name', e.target.value)}
                          className="font-semibold text-sm text-navy bg-white border border-gray-300 rounded-lg px-2.5 py-1 flex-1 focus:outline-none focus:ring-2 focus:ring-green/30"
                          placeholder="Concept name…"
                        />
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-gray-500 font-medium">Marks:</label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={concept.marks}
                            onChange={(e) => updateConcept(idx, 'marks', e.target.value)}
                            className="w-16 text-center text-xs font-bold border border-gray-300 rounded-lg py-1 bg-white focus:outline-none focus:ring-2 focus:ring-green/30"
                          />
                        </div>

                        <select
                          value={concept.importance || 'medium'}
                          onChange={(e) => updateConcept(idx, 'importance', e.target.value)}
                          className="text-xs font-semibold uppercase tracking-wider border border-gray-300 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-green/30"
                        >
                          {IMPORTANCE_LEVELS.map((imp) => (
                            <option key={imp} value={imp}>
                              {imp}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => removeConcept(idx)}
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                          title="Remove concept"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <input
                        type="text"
                        value={concept.description || ''}
                        onChange={(e) => updateConcept(idx, 'description', e.target.value)}
                        placeholder="Expected conceptual description or definition…"
                        className="w-full text-xs text-gray-600 bg-white border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green/30"
                      />
                    </div>

                    {/* Acceptable phrases */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                        Acceptable Phrasings (comma separated)
                      </label>
                      <input
                        type="text"
                        value={(concept.acceptablePhrases || []).join(', ')}
                        onChange={(e) =>
                          updateConcept(
                            idx,
                            'acceptablePhrases',
                            e.target.value.split(',').map((p) => p.trim())
                          )
                        }
                        placeholder="e.g. learning from data, learns using patterns, historical data"
                        className="w-full text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-green/30"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Concept Form */}
              {showAddConcept ? (
                <div className="p-4 rounded-xl border border-green/30 bg-mint/20 space-y-3">
                  <h4 className="text-xs font-bold text-green uppercase tracking-wider">Add New Educational Concept</h4>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Concept name (e.g. Supervised Learning)"
                      value={newConcept.name}
                      onChange={(e) => setNewConcept({ ...newConcept, name: e.target.value })}
                      className="border border-gray-300 rounded-lg p-2 text-xs bg-white"
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.5"
                        placeholder="Marks"
                        value={newConcept.marks}
                        onChange={(e) => setNewConcept({ ...newConcept, marks: e.target.value })}
                        className="w-20 border border-gray-300 rounded-lg p-2 text-xs bg-white"
                      />
                      <select
                        value={newConcept.importance}
                        onChange={(e) => setNewConcept({ ...newConcept, importance: e.target.value })}
                        className="flex-1 border border-gray-300 rounded-lg p-2 text-xs bg-white capitalize"
                      >
                        {IMPORTANCE_LEVELS.map((imp) => (
                          <option key={imp} value={imp}>
                            {imp}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Concept description…"
                    value={newConcept.description}
                    onChange={(e) => setNewConcept({ ...newConcept, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Acceptable phrases (comma separated)…"
                    value={newConcept.acceptablePhrases}
                    onChange={(e) => setNewConcept({ ...newConcept, acceptablePhrases: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-white"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={handleAddConcept}
                      className="px-3 py-1.5 rounded-lg bg-green text-white text-xs font-semibold"
                    >
                      Add Concept
                    </button>
                    <button
                      onClick={() => setShowAddConcept(false)}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-600 bg-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddConcept(true)}
                  className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-xs font-semibold text-green hover:bg-mint/30 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>+</span> Add Custom Concept
                </button>
              )}

              {/* Explicit Relationships Section */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-navy">Explicit Concept Relationships</h4>
                    <p className="text-[11px] text-gray-500">
                      Used for conservative misconception and relationship analysis.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddRelationship(!showAddRelationship)}
                    className="text-xs font-semibold text-green hover:underline"
                  >
                    {showAddRelationship ? 'Cancel' : '+ Add Relationship'}
                  </button>
                </div>

                {showAddRelationship && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-2 mb-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Source concept"
                        value={newRelationship.sourceConcept}
                        onChange={(e) => setNewRelationship({ ...newRelationship, sourceConcept: e.target.value })}
                        className="text-xs border border-gray-300 rounded-lg p-1.5 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Relationship (e.g. uses)"
                        value={newRelationship.relationship}
                        onChange={(e) => setNewRelationship({ ...newRelationship, relationship: e.target.value })}
                        className="text-xs border border-gray-300 rounded-lg p-1.5 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Target concept"
                        value={newRelationship.targetConcept}
                        onChange={(e) => setNewRelationship({ ...newRelationship, targetConcept: e.target.value })}
                        className="text-xs border border-gray-300 rounded-lg p-1.5 bg-white"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={handleAddRelationship}
                        className="px-3 py-1 rounded-lg bg-green text-white text-xs font-medium"
                      >
                        Save Relationship
                      </button>
                    </div>
                  </div>
                )}

                {(activeRubric.relationships || []).length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No explicit relationships defined.</p>
                ) : (
                  <div className="space-y-2">
                    {activeRubric.relationships.map((rel, rIdx) => (
                      <div
                        key={rIdx}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-gray-200 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-navy">{rel.sourceConcept}</span>
                          <span className="px-2 py-0.5 rounded bg-aqua/20 text-navy font-mono text-[11px]">
                            {rel.relationship}
                          </span>
                          <span className="font-semibold text-navy">{rel.targetConcept}</span>
                        </div>
                        <button
                          onClick={() => removeRelationship(rIdx)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Rubric Action Bar */}
              <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                  <button
                    onClick={handleSaveRubric}
                    disabled={saving}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-navy text-white text-xs font-semibold hover:bg-navy-dark transition-all disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>

                  <button
                    onClick={handleApproveRubric}
                    disabled={approving || !isMarksBalanced || activeRubric.approved}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      activeRubric.approved
                        ? 'bg-mint text-green border border-green/30 cursor-default'
                        : isMarksBalanced
                        ? 'bg-green hover:bg-green-dark text-white shadow'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {activeRubric.approved ? 'Rubric Approved' : 'Approve Rubric'}
                  </button>
                </div>

                <button
                  onClick={() => navigate(`/evaluate?rubricId=${activeRubric._id}`)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-yellow hover:bg-yellow-dark text-navy font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Test Student Answer on this Rubric →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Rubric;
