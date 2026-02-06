import React, { useState, useEffect } from 'react';

// Configuration - Update this URL after deployment
const DATA_URL = 'https://eleradashboardstorage.blob.core.windows.net/dashboard-data/elera-clusters.json';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch(DATA_URL + '?t=' + Date.now());
      if (!response.ok) throw new Error('Failed to fetch data');
      const json = await response.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getVersionColor = (version) => {
    if (version?.includes('2504')) return 'bg-green-500';
    if (version?.includes('2503')) return 'bg-yellow-500';
    if (version?.includes('2502')) return 'bg-blue-500';
    if (version?.includes('2501')) return 'bg-orange-500';
    return 'bg-gray-500';
  };

  const getStatusColor = (podStatus) => {
    if (!podStatus) return 'bg-gray-200';
    if (podStatus.failed > 0) return 'bg-red-100 border-red-500';
    if (podStatus.pending > 0) return 'bg-yellow-100 border-yellow-500';
    return 'bg-green-100 border-green-500';
  };

  const filteredDeployments = data?.deployments?.filter(d => 
    !filter || 
    d.cluster.toLowerCase().includes(filter.toLowerCase()) ||
    d.namespace.toLowerCase().includes(filter.toLowerCase()) ||
    d.version?.toLowerCase().includes(filter.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading ELERA Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-cyan-400">ELERA Platform Dashboard</h1>
            <p className="text-gray-400 text-sm">
              Last updated: {data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : 'Unknown'}
            </p>
          </div>
          <button 
            onClick={fetchData}
            className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            ↻ Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-6 py-3 max-w-7xl mx-auto mt-4 rounded-lg">
          Error: {error}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-3xl font-bold text-cyan-400">{data?.summary?.totalDeployments || 0}</div>
            <div className="text-gray-400 text-sm">ELERA Deployments</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-3xl font-bold text-green-400">{data?.summary?.runningClusters || 0}</div>
            <div className="text-gray-400 text-sm">Running Clusters</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-3xl font-bold text-red-400">{data?.summary?.stoppedClusters || 0}</div>
            <div className="text-gray-400 text-sm">Stopped Clusters</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-3xl font-bold text-purple-400">{data?.summary?.totalClusters || 0}</div>
            <div className="text-gray-400 text-sm">Total Clusters</div>
          </div>
        </div>

        {/* Version Distribution */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-8">
          <h2 className="text-lg font-semibold mb-3">Version Distribution</h2>
          <div className="flex flex-wrap gap-3">
            {data?.summary?.versionDistribution && Object.entries(data.summary.versionDistribution)
              .sort((a, b) => b[0].localeCompare(a[0]))
              .map(([version, count]) => (
                <div key={version} className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${getVersionColor(version)}`}></span>
                  <span className="text-gray-300">{version}: <strong>{count}</strong></span>
                </div>
              ))}
          </div>
        </div>

        {/* Quick Access URLs */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 mb-8">
          <div className="px-4 py-3 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-cyan-400">🔗 Quick Access - Admin UI</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredDeployments.filter(d => d.adminUiUrl).map((deployment, idx) => (
                <a
                  key={idx}
                  href={deployment.adminUiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between bg-gray-700 hover:bg-gray-600 rounded-lg p-3 transition-colors group"
                >
                  <div>
                    <div className="font-medium text-white group-hover:text-cyan-400">
                      {deployment.namespace}
                    </div>
                    <div className="text-xs text-gray-400">{deployment.cluster}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getVersionColor(deployment.version)}`}>
                      {deployment.version}
                    </span>
                    <span className="text-gray-400 group-hover:text-cyan-400">→</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Search/Filter */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Filter by cluster, namespace, or version..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full md:w-96 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Deployments Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700">
            <h2 className="text-lg font-semibold">All Deployments ({filteredDeployments.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-750">
                <tr className="text-left text-gray-400 text-sm">
                  <th className="px-4 py-3 font-medium">Cluster</th>
                  <th className="px-4 py-3 font-medium">Namespace</th>
                  <th className="px-4 py-3 font-medium">Version</th>
                  <th className="px-4 py-3 font-medium">Pods</th>
                  <th className="px-4 py-3 font-medium">Links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredDeployments.map((deployment, idx) => (
                  <tr key={idx} className={`hover:bg-gray-750 ${getStatusColor(deployment.podStatus)}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{deployment.cluster}</div>
                      <div className="text-xs text-gray-500">{deployment.resourceGroup}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-cyan-400">{deployment.namespace}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getVersionColor(deployment.version)}`}>
                        {deployment.version}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {deployment.podStatus && (
                        <div className="flex gap-2 text-xs">
                          <span className="text-green-400">✓ {deployment.podStatus.running}</span>
                          {deployment.podStatus.pending > 0 && (
                            <span className="text-yellow-400">◷ {deployment.podStatus.pending}</span>
                          )}
                          {deployment.podStatus.failed > 0 && (
                            <span className="text-red-400">✗ {deployment.podStatus.failed}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {deployment.adminUiUrl && (
                          <a
                            href={deployment.adminUiUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:text-cyan-300 text-sm"
                          >
                            Admin
                          </a>
                        )}
                        {deployment.webPosUrl && (
                          <a
                            href={deployment.webPosUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-400 hover:text-green-300 text-sm"
                          >
                            WebPOS
                          </a>
                        )}
                        {deployment.configurationsUrl && (
                          <a
                            href={deployment.configurationsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 text-sm"
                          >
                            Config
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cluster Overview */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 mt-8">
          <div className="px-4 py-3 border-b border-gray-700">
            <h2 className="text-lg font-semibold">AKS Cluster Overview</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 text-sm">
                  <th className="px-4 py-3 font-medium">Cluster</th>
                  <th className="px-4 py-3 font-medium">Resource Group</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">K8s Version</th>
                  <th className="px-4 py-3 font-medium">State</th>
                  <th className="px-4 py-3 font-medium">Nodes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {data?.clusters?.map((cluster, idx) => (
                  <tr key={idx} className="hover:bg-gray-750">
                    <td className="px-4 py-3 font-medium text-white">{cluster.name}</td>
                    <td className="px-4 py-3 text-gray-400">{cluster.resourceGroup}</td>
                    <td className="px-4 py-3 text-gray-400">{cluster.location}</td>
                    <td className="px-4 py-3 text-gray-400">{cluster.kubernetesVersion}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        cluster.powerState === 'Running' 
                          ? 'bg-green-900 text-green-300' 
                          : 'bg-red-900 text-red-300'
                      }`}>
                        {cluster.powerState}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{cluster.nodeCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 px-6 py-4 mt-8">
        <div className="max-w-7xl mx-auto text-center text-gray-500 text-sm">
          ELERA Platform Dashboard • Subscription: {data?.subscription?.name}
        </div>
      </footer>
    </div>
  );
}

export default App;
