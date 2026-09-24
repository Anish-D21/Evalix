import PageHeader from '../components/PageHeader.jsx';

function Dashboard() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="An overview of your syllabi, blueprints, question papers, and rubrics will appear here once connected to the backend."
      />
      <div className="rounded-xl border border-gray-100 bg-pink/40 p-6 text-sm text-gray-600">
        This page is a placeholder. Summary statistics and recent activity will be wired up in the next
        implementation step.
      </div>
    </div>
  );
}

export default Dashboard;
