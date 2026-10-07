import { Activity, CheckCircle2, CircleDashed, GitMerge, GitPullRequest } from "lucide-react";

const Dashboard = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Open Issues" value="12" icon={<CircleDashed className="w-5 h-5 text-orange-400" />} />
        <StatCard title="In Progress" value="5" icon={<Activity className="w-5 h-5 text-primary-500" />} />
        <StatCard title="Completed" value="28" icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />} />
        <StatCard title="Open PRs" value="3" icon={<GitPullRequest className="w-5 h-5 text-blue-400" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Activity */}
        <div className="lg:col-span-2 card p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-slate-400" />
            Recent Activity
          </h3>
          <div className="space-y-6">
            <ActivityItem 
              title="Ali merged pull request #18" 
              time="2 hours ago" 
              icon={<GitMerge className="w-4 h-4 text-purple-400" />} 
            />
            <ActivityItem 
              title="Mughees moved DF-42 to In Progress" 
              time="4 hours ago" 
              icon={<Activity className="w-4 h-4 text-primary-500" />} 
            />
            <ActivityItem 
              title="Ali commented on DF-38" 
              time="5 hours ago" 
              icon={<CircleDashed className="w-4 h-4 text-slate-400" />} 
            />
          </div>
        </div>

        {/* Assigned to Me */}
        <div className="card p-6">
          <h3 className="text-lg font-medium mb-4">Assigned to me</h3>
          <div className="space-y-3">
            <IssueItem keyId="DF-42" title="Fix authentication token expiration" status="IN PROGRESS" />
            <IssueItem keyId="DF-51" title="Design main dashboard UI" status="TODO" />
          </div>
        </div>

      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon }) => (
  <div className="card p-6 flex items-center justify-between hover:border-dark-600 transition-colors">
    <div>
      <p className="text-sm font-medium text-slate-400">{title}</p>
      <p className="text-3xl font-semibold text-slate-100 mt-2">{value}</p>
    </div>
    <div className="w-12 h-12 rounded-full bg-dark-700/50 flex items-center justify-center">
      {icon}
    </div>
  </div>
);

const ActivityItem = ({ title, time, icon }) => (
  <div className="flex gap-4 relative">
    <div className="absolute left-[11px] top-6 bottom-[-24px] w-px bg-dark-700 last:hidden"></div>
    <div className="relative z-10 w-6 h-6 rounded-full bg-dark-800 border border-dark-600 flex items-center justify-center shrink-0 mt-0.5">
      {icon}
    </div>
    <div>
      <p className="text-sm text-slate-200">{title}</p>
      <p className="text-xs text-slate-500 mt-1">{time}</p>
    </div>
  </div>
);

const IssueItem = ({ keyId, title, status }) => (
  <div className="p-3 rounded bg-dark-900/50 border border-dark-700/50 hover:bg-dark-700/50 transition-colors cursor-pointer group">
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs font-medium text-slate-400 group-hover:text-primary-400 transition-colors">{keyId}</span>
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-dark-800 text-slate-300 border border-dark-700">
        {status}
      </span>
    </div>
    <p className="text-sm text-slate-200 line-clamp-1">{title}</p>
  </div>
);

export default Dashboard;
