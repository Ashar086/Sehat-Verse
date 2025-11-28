// Utility to track agent visits for activity timeline
export const trackAgentVisit = (agentName: string) => {
  try {
    const visits = JSON.parse(localStorage.getItem('agent_visits') || '{}');
    visits[agentName] = new Date().toISOString();
    
    // Keep only the last 20 visits
    const sortedVisits = Object.entries(visits)
      .sort(([, a]: any, [, b]: any) => new Date(b).getTime() - new Date(a).getTime())
      .slice(0, 20);
    
    const limitedVisits = Object.fromEntries(sortedVisits);
    localStorage.setItem('agent_visits', JSON.stringify(limitedVisits));
  } catch (error) {
    console.error('Error tracking agent visit:', error);
  }
};

