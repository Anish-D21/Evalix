import PageHeader from '../components/PageHeader.jsx';

function Rubric() {
  return (
    <div>
      <PageHeader
        title="Rubric"
        description="Generate candidate grading concepts from a reference answer, then review each concept's name, description, marks, importance, and acceptable phrasings."
      />
      <div className="rounded-xl border border-gray-100 bg-pink/40 p-6 text-sm text-gray-600">
        The generation form and concept review list will be connected to <code>POST /api/rubrics</code> in the next
        implementation step.
      </div>
    </div>
  );
}

export default Rubric;
