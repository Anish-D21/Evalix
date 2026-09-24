import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { listSyllabi } from '../services/syllabusService.js';
import { generateBlueprint } from '../services/blueprintService.js';
import { getErrorMessage } from '../services/api.js';

const DEFAULT_DIFFICULTY = { easy: 40, medium: 40, hard: 20 };
const DEFAULT_BLOOM = { remember: 20, understand: 25, apply: 25, analyze: 20, evaluate: 10, create: 0 };

function equalWeightage(units) {
  if (units.length === 0) return [];
  const each = Math.round((100 / units.length) * 100) / 100;
  return units.map((u, i) => ({
    unitNumber: u.unitNumber,
    title: u.title,
    weightage: i === units.length - 1 ? Math.round((100 - each * (units.length - 1)) * 100) / 100 : each,
  }));
}

function Blueprint() {
  const [syllabi, setSyllabi] = useState([]);
  const [syllabiLoading, setSyllabiLoading] = useState(true);
  const [syllabiError, setSyllabiError] = useState('');
  const [selectedSyllabusId, setSelectedSyllabusId] = useState('');

  const [unitWeights, setUnitWeights] = useState([]);
  const [totalMarks, setTotalMarks] = useState(100);
  const [totalQuestions, setTotalQuestions] = useState(20);
  const [difficulty, setDifficulty] = useState(DEFAULT_DIFFICULTY);
  const [bloom, setBloom] = useState(DEFAULT_BLOOM);

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [blueprint, setBlueprint] = useState(null);

  useEffect(() => {
    listSyllabi()
      .then(setSyllabi)
      .catch((err) => setSyllabiError(getErrorMessage(err)))
      .finally(() => setSyllabiLoading(false));
  }, []);

  const selectedSyllabus = syllabi.find((s) => s._id === selectedSyllabusId);

  function handleSelectSyllabus(id) {
    setSelectedSyllabusId(id);
    setBlueprint(null);
    setGenerateError('');
    const syllabus = syllabi.find((s) => s._id === id);
    setUnitWeights(equalWeightage(syllabus?.units || []));
  }

  function updateWeight(index, value) {
    setUnitWeights((prev) => prev.map((u, i) => (i === index ? { ...u, weightage: Number(value) } : u)));
  }

  function updateDifficulty(key, value) {
    setDifficulty((prev) => ({ ...prev, [key]: Number(value) }));
  }

  function updateBloom(key, value) {
    setBloom((prev) => ({ ...prev, [key]: Number(value) }));
  }

  const unitSum = unitWeights.reduce((s, u) => s + (u.weightage || 0), 0);
  const difficultySum = Object.values(difficulty).reduce((s, v) => s + v, 0);
  const bloomSum = Object.values(bloom).reduce((s, v) => s + v, 0);

  async function handleGenerate(e) {
    e.preventDefault();
    if (unitWeights.length === 0) {
      setGenerateError('Select a syllabus with at least one unit first.');
      return;
    }
    setGenerating(true);
    setGenerateError('');
    setBlueprint(null);
    try {
      const result = await generateBlueprint({
        totalMarks: Number(totalMarks),
        totalQuestions: Number(totalQuestions),
        units: unitWeights,
        difficultyDistribution: difficulty,
        bloomDistribution: bloom,
        syllabusId: selectedSyllabusId || undefined,
      });
      setBlueprint(result);
    } catch (err) {
      setGenerateError(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Blueprint"
        description="Select a syllabus and configure how marks and questions should be allocated across units, difficulty, and Bloom's taxonomy levels."
      />

      <form onSubmit={handleGenerate} className="rounded-xl border border-gray-200 bg-white p-6 mb-8 space-y-6">
        {/* Syllabus selection */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Syllabus</label>
          {syllabiLoading && <p className="text-sm text-gray-500">Loading syllabi…</p>}
          {syllabiError && <p className="text-sm text-red-600">{syllabiError}</p>}
          {!syllabiLoading && !syllabiError && syllabi.length === 0 && (
            <p className="text-sm text-gray-400">
              No syllabi found. Upload one on the <span className="font-medium">Syllabus</span> page first.
            </p>
          )}
          {!syllabiLoading && !syllabiError && syllabi.length > 0 && (
            <select
              value={selectedSyllabusId}
              onChange={(e) => handleSelectSyllabus(e.target.value)}
              className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green/40"
            >
              <option value="">Select a syllabus…</option>
              {syllabi.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Unit weightage */}
        {unitWeights.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">
              Unit Weightage (%) — sum: {unitSum.toFixed(1)}
            </label>
            <div className="space-y-2">
              {unitWeights.map((u, i) => (
                <div key={u.unitNumber} className="flex items-center gap-3">
                  <span className="text-sm text-navy flex-1">
                    Unit {u.unitNumber}: {u.title}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={u.weightage}
                    onChange={(e) => updateWeight(i, e.target.value)}
                    className="w-24 border border-gray-300 rounded-lg px-2 py-1 text-sm text-right"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Total Marks</label>
            <input
              type="number"
              min="1"
              value={totalMarks}
              onChange={(e) => setTotalMarks(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Total Questions</label>
            <input
              type="number"
              min="1"
              value={totalQuestions}
              onChange={(e) => setTotalQuestions(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">
            Difficulty Distribution (%) — sum: {difficultySum.toFixed(1)}
          </label>
          <div className="grid grid-cols-3 gap-3">
            {Object.keys(difficulty).map((key) => (
              <div key={key}>
                <span className="block text-xs text-gray-400 capitalize mb-1">{key}</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={difficulty[key]}
                  onChange={(e) => updateDifficulty(key, e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Bloom */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">
            Bloom's Taxonomy Distribution (%) — sum: {bloomSum.toFixed(1)}
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {Object.keys(bloom).map((key) => (
              <div key={key}>
                <span className="block text-xs text-gray-400 capitalize mb-1">{key}</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={bloom[key]}
                  onChange={(e) => updateBloom(key, e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={generating}
          className="px-4 py-2 rounded-lg bg-green text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {generating ? 'Generating…' : 'Generate Blueprint'}
        </button>
        {generateError && <p className="text-sm text-red-600">{generateError}</p>}
      </form>

      {/* Result */}
      {blueprint && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-navy mb-1">Generated Blueprint</h3>
          <p className="text-xs text-gray-400 mb-4">
            {selectedSyllabus ? `For syllabus: ${selectedSyllabus.title}` : 'No syllabus linked'} · Total Marks:{' '}
            {blueprint.totalMarks} · Total Questions: {blueprint.totalQuestions}
          </p>

          {blueprint.warnings?.length > 0 && (
            <div className="mb-4 rounded-lg bg-yellow/20 border border-yellow/40 p-3 text-xs text-navy space-y-1">
              {blueprint.warnings.map((w, i) => (
                <p key={i}>⚠ {w}</p>
              ))}
            </div>
          )}

          {[
            { label: 'Unit-wise Allocation', rows: blueprint.units, nameKey: 'title', prefix: 'Unit' },
            { label: 'Difficulty Allocation', rows: blueprint.difficulty, nameKey: 'label' },
            { label: "Bloom's Level Allocation", rows: blueprint.bloom, nameKey: 'label' },
          ].map((section) => (
            <div key={section.label} className="mb-6 last:mb-0">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{section.label}</h4>
              <table className="w-full text-sm border border-gray-100 rounded-lg overflow-hidden">
                <thead className="bg-pink/40 text-left text-xs text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">%</th>
                    <th className="px-3 py-2">Questions</th>
                    <th className="px-3 py-2">Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {(section.rows || []).map((row, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-navy">
                        {section.prefix ? `${section.prefix} ${row.unitNumber}: ` : ''}
                        {row[section.nameKey]}
                      </td>
                      <td className="px-3 py-2 text-gray-500">{row.percentage}%</td>
                      <td className="px-3 py-2 text-gray-500">{row.questionCount}</td>
                      <td className="px-3 py-2 text-gray-500">{row.marks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Blueprint;
