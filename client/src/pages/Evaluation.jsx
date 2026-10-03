import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import BrandLogo from '../components/BrandLogo.jsx';
import { evaluateStudentAnswer } from '../services/evaluationService.js';
import { listRubrics, getRubric } from '../services/rubricService.js';
import { listQuestions } from '../services/questionService.js';
import { getErrorMessage } from '../services/api.js';

// Pre-packaged educational samples for instant testing/demonstration
const SAMPLE_ANSWERS = {
  complete: {
    label: 'Comprehensive Answer',
    text: 'Machine Learning is a subset of Artificial Intelligence that enables computers to learn patterns from data without being explicitly programmed. It includes supervised, unsupervised, and reinforcement learning. In supervised learning, models train on labelled datasets. Models are trained, evaluated, and used to make predictions on unseen data.',
  },
  partial: {
    label: 'Partial Answer (Missing Topics)',
    text: 'Machine learning is a part of AI where computers learn from data. It includes supervised and unsupervised learning where models are trained using datasets to make predictions.',
  },
  misconception: {
    label: 'Answer with Misconception',
    text: 'Machine Learning is a branch of AI where algorithms learn from data. However, supervised learning does not require labelled data at all and works without any targets.',
  },
};

function Evaluation() {
  const [searchParams] = useSearchParams();
  const queryRubricId = searchParams.get('rubricId') || '';

  // Rubrics & Questions repository
  const [rubrics, setRubrics] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedRubricId, setSelectedRubricId] = useState(queryRubricId);
  const [activeRubric, setActiveRubric] = useState(null);

  // Form input states
  const [questionText, setQuestionText] = useState('Explain Machine Learning.');
  const [referenceAnswer, setReferenceAnswer] = useState(
    'Machine Learning is a subset of Artificial Intelligence that enables computers to learn patterns from data without being explicitly programmed. It includes supervised, unsupervised, and reinforcement learning. Models are trained, evaluated, and used to make predictions.'
  );
  const [studentAnswer, setStudentAnswer] = useState('');

  // Evaluation states
  const [evaluating, setEvaluating] = useState(false);
  const [evalError, setEvalError] = useState('');
  const [evalResult, setEvalResult] = useState(null);

  // Load rubrics and questions
  useEffect(() => {
    listRubrics()
      .then((data) => {
        setRubrics(data || []);
        if (queryRubricId) {
          const matched = data.find((r) => r._id === queryRubricId);
          if (matched) {
            setActiveRubric(matched);
            setSelectedRubricId(matched._id);
          }
        }
      })
      .catch(() => {});

    listQuestions()
      .then((data) => setQuestions(data || []))
      .catch(() => {});
  }, [queryRubricId]);

  // When a saved rubric is chosen
  async function handleRubricSelect(rId) {
    setSelectedRubricId(rId);
    setEvalResult(null);
    setEvalError('');

    if (!rId) {
      setActiveRubric(null);
      return;
    }

    try {
      const rubricData = await getRubric(rId);
      setActiveRubric(rubricData);
      if (rubricData.questionId) {
        const matchedQ = questions.find((q) => q._id === rubricData.questionId);
        if (matchedQ) {
          setQuestionText(matchedQ.text);
        }
      }
    } catch (err) {
      setEvalError(getErrorMessage(err));
    }
  }

  // Submit for Evaluation
  async function handleEvaluate(e) {
    e.preventDefault();
    if (!studentAnswer.trim()) {
      setEvalError('Please provide a student answer to evaluate.');
      return;
    }

    // Determine rubric source
    let rubricPayload = null;
    if (activeRubric) {
      rubricPayload = {
        totalMarks: Number(activeRubric.totalMarks),
        concepts: activeRubric.concepts,
        relationships: activeRubric.relationships || [],
      };
    } else {
      // Default baseline rubric if evaluating ad-hoc
      rubricPayload = {
        totalMarks: 10,
        concepts: [
          { id: 'ml_def', name: 'Machine Learning Definition', marks: 2, importance: 'critical', acceptablePhrases: ['subset of AI', 'branch of AI', 'machine learning'] },
          { id: 'learn_data', name: 'Learning from Data', marks: 2, importance: 'critical', acceptablePhrases: ['learn from data', 'patterns from data'] },
          { id: 'supervised', name: 'Supervised Learning', marks: 1.5, importance: 'high', acceptablePhrases: ['supervised learning'] },
          { id: 'unsupervised', name: 'Unsupervised Learning', marks: 1.5, importance: 'high', acceptablePhrases: ['unsupervised learning'] },
          { id: 'reinforcement', name: 'Reinforcement Learning', marks: 1, importance: 'medium', acceptablePhrases: ['reinforcement learning'] },
          { id: 'model_training', name: 'Model Training', marks: 1, importance: 'medium', acceptablePhrases: ['models are trained', 'train on datasets'] },
          { id: 'prediction', name: 'Prediction', marks: 1, importance: 'medium', acceptablePhrases: ['predictions', 'predict'] },
        ],
        relationships: [
          { sourceConcept: 'Supervised Learning', relationship: 'uses', targetConcept: 'Labelled Data', importance: 'high', marks: 0 },
        ],
      };
    }

    setEvaluating(true);
    setEvalError('');
    setEvalResult(null);

    try {
      const result = await evaluateStudentAnswer({
        question: questionText.trim() || undefined,
        referenceAnswer: referenceAnswer.trim() || undefined,
        rubric: rubricPayload,
        studentAnswer: studentAnswer.trim(),
      });
      setEvalResult(result);
    } catch (err) {
      setEvalError(getErrorMessage(err));
    } finally {
      setEvaluating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Explainable Semantic Answer Evaluation"
        description="Evaluate descriptive student answers against teacher-approved rubrics using Sentence-Transformers (all-MiniLM-L6-v2) and spaCy. Features concept-level matching, partial credit, and conservative misconception analysis."
        badge="Phase 8 Step 4 — NLP Core"
      />

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Assessment Input & Setup */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6">
            <h3 className="text-base font-semibold text-navy flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow" />
              Evaluation Setup
            </h3>

            <form onSubmit={handleEvaluate} className="space-y-4">
              {/* Rubric selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Select Evaluation Rubric
                </label>
                <select
                  value={selectedRubricId}
                  onChange={(e) => handleRubricSelect(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-green/30 bg-slate-50/50"
                >
                  <option value="">Use Built-in Default Rubric (Machine Learning)</option>
                  {rubrics.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.approved ? '✓ [Approved] ' : '[Draft] '}
                      Rubric ({r.concepts?.length} concepts · {r.totalMarks}m)
                    </option>
                  ))}
                </select>
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Question
                </label>
                <input
                  type="text"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-green/30"
                />
              </div>

              {/* Reference Answer */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Teacher Reference Answer (Optional Context)
                </label>
                <textarea
                  rows={3}
                  value={referenceAnswer}
                  onChange={(e) => setReferenceAnswer(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-green/30"
                />
              </div>

              {/* Active Rubric Concepts Preview */}
              {activeRubric && (
                <div className="p-3 rounded-xl bg-pink/40 border border-pink-dark/20 text-xs">
                  <div className="font-semibold text-navy flex items-center justify-between mb-1.5">
                    <span>Active Rubric Concepts:</span>
                    <span className="font-bold text-green">{activeRubric.totalMarks} Marks</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {activeRubric.concepts?.map((c) => (
                      <span key={c.id} className="px-2 py-0.5 rounded-full bg-white text-[11px] text-navy border border-gray-200">
                        {c.name} ({c.marks}m)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Student Answer */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-700">
                    Student Descriptive Answer <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-gray-400">
                    {studentAnswer.trim().split(/\s+/).filter(Boolean).length} words
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={studentAnswer}
                  onChange={(e) => setStudentAnswer(e.target.value)}
                  placeholder="Paste or type the student's descriptive response here..."
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-green/30 leading-relaxed"
                />
              </div>

              {/* Quick Preset Buttons for Demonstration */}
              <div>
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Quick Load Test Scenarios:
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(SAMPLE_ANSWERS).map(([key, sample]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStudentAnswer(sample.text)}
                      className="px-2.5 py-1 rounded-lg border border-gray-200 bg-slate-50 hover:bg-mint/40 hover:border-green/30 text-[11px] font-medium text-navy transition-all"
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={evaluating}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-charcoal via-brand-carbon to-brand-charcoal hover:from-brand-carbon hover:to-brand-charcoal text-white font-bold text-sm shadow-lg shadow-black/20 border border-brand-charcoal/80 hover:border-brand-ice/60 hover:shadow-glow-ice transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 group"
              >
                {evaluating ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-brand-ice" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Evaluating with Semantic NLP Engine…</span>
                  </>
                ) : (
                  <>
                    <span>Evaluate Student Answer</span>
                    <span className="text-brand-ice group-hover:translate-x-1 transition-transform">→</span>
                  </>
                )}
              </button>

              {evalError && <p className="text-xs text-red-500 font-medium">{evalError}</p>}
            </form>
          </div>
        </div>

        {/* Right Column: Explainable Semantic Results View */}
        <div className="lg:col-span-7">
          {!evalResult ? (
            <div className="bg-white dark:bg-[#161F1F] rounded-2xl border-2 border-dashed border-gray-200 dark:border-brand-charcoal/50 p-12 text-center transition-colors">
              <div className="flex justify-center mb-4">
                <BrandLogo variant="mark" size="lg" />
              </div>
              <h4 className="text-base font-bold font-display text-brand-carbon dark:text-brand-silk">No Evaluation Results Yet</h4>
              <p className="text-xs text-brand-granite dark:text-brand-lilac/75 mt-1.5 max-w-md mx-auto leading-relaxed">
                Provide a student answer on the left and click <span className="font-semibold text-brand-carbon dark:text-brand-ice">Evaluate Student Answer</span> to inspect the explainable semantic scoring breakdown, evidence quotes, and misconception analysis.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Scorecard Hero Banner */}
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Overall Evaluation Score
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-4xl font-extrabold font-display text-navy">
                        {evalResult.overallScore}
                      </span>
                      <span className="text-base font-semibold text-gray-400">
                        / {evalResult.maxScore} Marks
                      </span>
                      <span className="ml-2 text-xs font-bold px-2.5 py-0.5 rounded-full bg-mint text-green border border-green/30">
                        {Math.round((evalResult.overallScore / (evalResult.maxScore || 1)) * 100)}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-[10px] text-gray-400 font-semibold uppercase">Confidence</div>
                      <div className="text-xs font-bold text-navy flex items-center gap-1 mt-0.5 justify-end">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {evalResult.confidence}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metric Bars */}
                <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-gray-100">
                  <div className="p-3 rounded-xl bg-mint/40 border border-green/20">
                    <div className="text-[11px] font-semibold text-green uppercase">Concept Coverage</div>
                    <div className="text-xl font-bold font-display text-navy mt-1">
                      {evalResult.conceptCoverageScore}%
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-aqua/20 border border-aqua/40">
                    <div className="text-[11px] font-semibold text-navy uppercase">Semantic Match</div>
                    <div className="text-xl font-bold font-display text-navy mt-1">
                      {evalResult.semanticUnderstandingScore}%
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-pink/50 border border-pink-dark/20">
                    <div className="text-[11px] font-semibold text-gray-700 uppercase">Relationships</div>
                    <div className="text-xl font-bold font-display text-navy mt-1">
                      {evalResult.relationshipScore}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Covered Concepts Section */}
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                  <h4 className="text-sm font-bold text-navy flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green" />
                    Covered Concepts ({evalResult.coveredConcepts?.length || 0})
                  </h4>
                  <span className="text-xs font-semibold text-green bg-mint px-2 py-0.5 rounded-full">
                    Demonstrated Understanding
                  </span>
                </div>

                {(evalResult.coveredConcepts || []).length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No concepts met full coverage criteria.</p>
                ) : (
                  <div className="space-y-3">
                    {evalResult.coveredConcepts.map((c) => (
                      <div
                        key={c.id}
                        className="p-3.5 rounded-xl bg-mint/30 border border-green/20 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-navy">{c.name}</span>
                          <span className="text-xs font-bold text-green">
                            +{c.awardedMarks} / {c.marks} Marks
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 flex items-center gap-2">
                          <span className="text-[11px] font-medium text-gray-500">Semantic similarity:</span>
                          <span className="font-semibold text-navy">{Math.round(c.similarity * 100)}%</span>
                        </div>
                        {c.evidence && (
                          <div className="mt-1 p-2 rounded-lg bg-white/80 border border-green/10 text-xs text-gray-700 italic">
                            <span className="font-semibold not-italic text-green mr-1">Evidence:</span>"{c.evidence}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Partial Concepts Section */}
              {evalResult.partialConcepts?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                    <h4 className="text-sm font-bold text-navy flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow" />
                      Partially Covered Concepts ({evalResult.partialConcepts.length})
                    </h4>
                    <span className="text-xs font-semibold text-amber-800 bg-yellow/20 px-2 py-0.5 rounded-full">
                      Partial Credit Awarded
                    </span>
                  </div>

                  <div className="space-y-3">
                    {evalResult.partialConcepts.map((c) => (
                      <div
                        key={c.id}
                        className="p-3.5 rounded-xl bg-yellow/10 border border-yellow/30 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-navy">{c.name}</span>
                          <span className="text-xs font-bold text-amber-800">
                            +{c.awardedMarks} / {c.marks} Marks
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          Semantic similarity: <span className="font-semibold text-navy">{Math.round(c.similarity * 100)}%</span> (Threshold: Partial)
                        </div>
                        {c.evidence && (
                          <div className="mt-1 p-2 rounded-lg bg-white/80 border border-yellow/20 text-xs text-gray-700 italic">
                            <span className="font-semibold not-italic text-amber-800 mr-1">Partial Evidence:</span>"{c.evidence}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Concepts Section */}
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                  <h4 className="text-sm font-bold text-navy flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-dark" />
                    Missing Important Concepts ({evalResult.missingConcepts?.length || 0})
                  </h4>
                  <span className="text-[11px] font-semibold text-gray-500">
                    Evaluated from Approved Rubric
                  </span>
                </div>

                {(evalResult.missingConcepts || []).length === 0 ? (
                  <p className="text-xs text-green font-medium">✓ Excellent! No required rubric concepts were missed.</p>
                ) : (
                  <div className="space-y-2">
                    {evalResult.missingConcepts.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-xl bg-pink/40 border border-pink-dark/20 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-semibold text-navy">{c.name}</span>
                          <span className="ml-2 text-[10px] uppercase font-bold text-gray-500">
                            Importance: {c.importance}
                          </span>
                        </div>
                        <span className="font-bold text-red-500">
                          0 / {c.marks} Marks
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Misconceptions & Contradictions Section */}
              {evalResult.misconceptions?.length > 0 && (
                <div className="bg-white rounded-2xl border border-amber-300 shadow-sm p-6 bg-amber-50/30">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-amber-200">
                    <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                      <span>⚠</span> Potential Misconceptions Detected ({evalResult.misconceptions.length})
                    </h4>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                      Conservative Analysis
                    </span>
                  </div>

                  <div className="space-y-3">
                    {evalResult.misconceptions.map((m, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-white border border-amber-200 text-xs space-y-1">
                        <div className="font-semibold text-navy">
                          Relationship Conflict: {m.sourceConcept} → {m.relationship} → {m.targetConcept}
                        </div>
                        <div className="italic text-gray-700">
                          Student Quote: "{m.evidenceSentence}"
                        </div>
                        <div className="text-amber-800 font-medium">
                          Note: {m.note}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Qualitative Feedback & Actionable Recommendations */}
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 space-y-4">
                <h4 className="text-sm font-bold text-navy pb-2 border-b border-gray-100">
                  Pedagogical Feedback &amp; Recommendations
                </h4>

                {/* Overall Feedback */}
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Overall Assessment
                  </div>
                  <p className="text-sm text-navy leading-relaxed p-3 rounded-xl bg-slate-50 border border-gray-200">
                    {evalResult.overallFeedback || 'The response demonstrates conceptual understanding aligned with the rubric.'}
                  </p>
                </div>

                {/* Strengths */}
                {evalResult.strengths?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-green uppercase tracking-wider mb-1">
                      Demonstrated Strengths
                    </div>
                    <ul className="space-y-1 pl-4 list-disc text-xs text-gray-700">
                      {evalResult.strengths.map((str, idx) => (
                        <li key={idx}>{str}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Improvement Areas */}
                {evalResult.improvementAreas?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">
                      Areas for Improvement
                    </div>
                    <ul className="space-y-1 pl-4 list-disc text-xs text-gray-700">
                      {evalResult.improvementAreas.map((imp, idx) => (
                        <li key={idx}>{imp}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Revision Recommendations */}
                {evalResult.revisionRecommendations?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-navy uppercase tracking-wider mb-1">
                      Suggested Revision Topics
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {evalResult.revisionRecommendations.map((rec, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-full bg-pink text-xs font-medium text-navy border border-pink-dark/30"
                        >
                          {rec}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Evaluation;
