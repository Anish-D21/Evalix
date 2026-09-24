import PageHeader from '../components/PageHeader.jsx';

function Evaluation() {
  return (
    <div>
      <PageHeader
        title="Answer Evaluation"
        description="Submit a student's answer against a rubric to receive an explainable semantic score, concept coverage, and feedback."
      />
      <div className="rounded-xl border border-gray-100 bg-pink/40 p-6 text-sm text-gray-600">
        The evaluation form and results view will be connected to the Node backend's answer-evaluation route (which
        forwards to the NLP service's <code>/api/nlp/evaluate-answer</code>) in the next implementation step.
      </div>
    </div>
  );
}

export default Evaluation;
