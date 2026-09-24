import PageHeader from '../components/PageHeader.jsx';

function Questions() {
  return (
    <div>
      <PageHeader
        title="Questions"
        description="Generate exam questions for a topic and Bloom's level, then review each question's text, marks, difficulty, and validation status."
      />
      <div className="rounded-xl border border-gray-100 bg-pink/40 p-6 text-sm text-gray-600">
        The generation form and question review list will be connected to <code>POST /api/questions</code> in the
        next implementation step.
      </div>
    </div>
  );
}

export default Questions;
