import { useEffect, useState } from "react";
import * as LangChain from "langchain";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, TrendingUp, MapPin, Activity, Shield, Users, TrendingDown, Minus, Calendar } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { supabase } from "@/integrations/supabase/client";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { toast } from "sonner";
import sehatverseLogo from "@/assets/sehatverse-logo.png";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

interface SurveillanceAlert {
  id: string;
  created_at: string;
  alert_type: string;
  disease_name: string;
  city: string | null;
  case_count: number;
  percentage: number;
  severity: string;
  recommendation: string;
  ai_assessment: string | null;
  confidence_score: number;
  status: string;
}

interface OutbreakForecast {
  id: string;
  created_at: string;
  forecast_date: string;
  disease_name: string;
  city: string | null;
  predicted_cases: number;
  risk_level: string;
  confidence_score: number;
  trend: string;
  contributing_factors: string[] | null;
  recommendation: string | null;
  ai_analysis: string | null;
}

const Surveillance = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<SurveillanceAlert[]>([]);
  const [forecasts, setForecasts] = useState<OutbreakForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingForecasts, setLoadingForecasts] = useState(false);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [runningForecast, setRunningForecast] = useState(false);

  // Example LangChain snippet
  useEffect(() => {
    (async () => {
      try {
        const lc = (LangChain as any);
        console.log("LangChain snippet running on Surveillance page", lc?.version || "no-version");
        if (lc?.Flow) {
          const flow = (lc as any).Flow?.create?.({});
          console.log("LangChain Flow:", flow);
        }
      } catch (err) {
        console.warn("LangChain init error (surveillance)", err);
      }
    })();
  }, []);

  const loadAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('surveillance_alerts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      console.error('Error loading alerts:', error);
      toast.error('Failed to load surveillance data');
    } finally {
      setLoading(false);
    }
  };

  const loadForecasts = async () => {
    setLoadingForecasts(true);
    try {
      const { data, error } = await supabase
        .from('outbreak_forecasts')
        .select('*')
        .gte('forecast_date', new Date().toISOString().split('T')[0])
        .order('forecast_date', { ascending: true })
        .limit(100);

      if (error) throw error;
      setForecasts(data || []);
    } catch (error: any) {
      console.error('Error loading forecasts:', error);
    } finally {
      setLoadingForecasts(false);
    }
  };

  const generateForecast = async () => {
    setRunningForecast(true);
    try {
      const { data, error } = await supabase.functions.invoke('outbreak-forecast', {
        body: { forecastDays: 7 }
      });

      if (error) throw error;
      
      toast.success('Forecast generated', {
        description: `Created ${data.predictions?.length || 0} disease predictions for next 7 days`
      });
      
      setTimeout(loadForecasts, 1000);
    } catch (error: any) {
      console.error('Error generating forecast:', error);
      toast.error('Failed to generate outbreak forecast');
    } finally {
      setRunningForecast(false);
    }
  };

  useEffect(() => {
    loadAlerts();
    loadForecasts();
    
    // Set up real-time subscriptions
    const alertsChannel = supabase
      .channel('surveillance-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'surveillance_alerts' }, () => {
        loadAlerts();
      })
      .subscribe();

    const forecastsChannel = supabase
      .channel('outbreak-forecasts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'outbreak_forecasts' }, () => {
        loadForecasts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(alertsChannel);
      supabase.removeChannel(forecastsChannel);
    };
  }, []);


  const runAnalysis = async () => {
    setRunningAnalysis(true);
    try {
      const { data, error } = await supabase.functions.invoke('surveillance-agent', {
        body: { analysisType: 'outbreak_detection' }
      });

      if (error) throw error;
      
      toast.success('Analysis complete', {
        description: `Detected ${data.alerts?.length || 0} potential health alerts`
      });
      
      // Reload alerts after analysis
      setTimeout(loadAlerts, 1000);
    } catch (error: any) {
      console.error('Error running analysis:', error);
      toast.error('Failed to run surveillance analysis');
    } finally {
      setRunningAnalysis(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getSeverityIcon = (severity: string) => {
    return severity === 'high' ? <AlertTriangle className="w-4 h-4" /> : <Activity className="w-4 h-4" />;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="w-4 h-4 text-destructive" />;
      case 'decreasing': return <TrendingDown className="w-4 h-4 text-green-500" />;
      default: return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  // Prepare chart data
  const diseaseData = alerts.reduce((acc: any[], alert) => {
    const existing = acc.find(item => item.disease === alert.disease_name);
    if (existing) {
      existing.cases += alert.case_count;
    } else {
      acc.push({ disease: alert.disease_name, cases: alert.case_count });
    }
    return acc;
  }, []);

  const cityData = alerts.reduce((acc: any[], alert) => {
    if (alert.city) {
      const existing = acc.find(item => item.city === alert.city);
      if (existing) {
        existing.alerts += 1;
      } else {
        acc.push({ city: alert.city, alerts: 1 });
      }
    }
    return acc;
  }, []).slice(0, 10);

  const severityData = [
    { name: 'High', value: alerts.filter(a => a.severity === 'high').length, color: 'hsl(var(--destructive))' },
    { name: 'Medium', value: alerts.filter(a => a.severity === 'medium').length, color: 'hsl(var(--primary))' },
    { name: 'Low', value: alerts.filter(a => a.severity === 'low').length, color: 'hsl(var(--secondary))' },
  ];

  const highSeverityAlerts = alerts.filter(a => a.severity === 'high');
  const totalCases = alerts.reduce((sum, a) => sum + a.case_count, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-lg border-b border-border/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton to="/dashboard" />
            <img src={sehatverseLogo} alt="SehatVerse" className="w-10 h-10" />
            <div>
              <h1 className="text-xl font-bold gradient-text">Disease Surveillance</h1>
              <p className="text-xs text-muted-foreground">
                Government Health Monitoring Dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={generateForecast}
              disabled={runningForecast}
              size="sm"
              variant="outline"
            >
              <Calendar className="w-4 h-4 mr-2" />
              {runningForecast ? 'Forecasting...' : 'Generate Forecast'}
            </Button>
            <Button 
              onClick={runAnalysis} 
              disabled={runningAnalysis}
              size="sm"
            >
              <Shield className="w-4 h-4 mr-2" />
              {runningAnalysis ? 'Analyzing...' : 'Run Analysis'}
            </Button>
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="story-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold gradient-text">{alerts.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Total surveillance alerts</p>
            </CardContent>
          </Card>

          <Card className="story-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">High Severity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{highSeverityAlerts.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Require immediate action</p>
            </CardContent>
          </Card>

          <Card className="story-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Cases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalCases}</div>
              <p className="text-xs text-muted-foreground mt-1">Monitored in last 7 days</p>
            </CardContent>
          </Card>

          <Card className="story-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cities Affected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{cityData.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Locations with alerts</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="story-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Disease Distribution
              </CardTitle>
              <CardDescription>Cases by disease type</CardDescription>
            </CardHeader>
            <CardContent>
              {diseaseData.length > 0 ? (
                <ChartContainer config={{}} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={diseaseData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="disease" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="cases" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="story-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Severity Breakdown
              </CardTitle>
              <CardDescription>Alert severity distribution</CardDescription>
            </CardHeader>
            <CardContent>
              {severityData.some(d => d.value > 0) ? (
                <ChartContainer config={{}} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={severityData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {severityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No alerts to display
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Outbreak Forecasts */}
        {forecasts.length > 0 && (
          <Card className="story-card mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                7-Day Outbreak Forecast
              </CardTitle>
              <CardDescription>
                Predictive analysis based on historical patterns and AI-powered real-time intelligence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {forecasts.slice(0, 6).map((forecast) => (
                  <Card key={forecast.id} className="border-l-4" style={{
                    borderLeftColor: forecast.risk_level === 'critical' || forecast.risk_level === 'high' ? 'hsl(var(--destructive))' : 
                                    forecast.risk_level === 'medium' ? 'hsl(var(--primary))' : 
                                    'hsl(var(--secondary))'
                  }}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg capitalize">{forecast.disease_name}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            {forecast.city && (
                              <>
                                <MapPin className="w-3 h-3" />
                                {forecast.city}
                                <span className="mx-1">•</span>
                              </>
                            )}
                            {new Date(forecast.forecast_date).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant={getRiskColor(forecast.risk_level)}>
                            {forecast.risk_level}
                          </Badge>
                          {getTrendIcon(forecast.trend)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-2xl font-bold gradient-text">{forecast.predicted_cases}</p>
                          <p className="text-xs text-muted-foreground">Predicted cases</p>
                        </div>
                        
                        {forecast.contributing_factors && forecast.contributing_factors.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Contributing Factors:</p>
                            <div className="flex flex-wrap gap-1">
                              {forecast.contributing_factors.map((factor, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {factor}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {forecast.recommendation && (
                          <p className="text-xs text-muted-foreground">
                            {forecast.recommendation}
                          </p>
                        )}
                        
                        <div className="text-xs text-muted-foreground">
                          Confidence: {Math.round(forecast.confidence_score * 100)}%
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {forecasts.length > 6 && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Showing 6 of {forecasts.length} forecasts
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* High Priority Alerts */}
        {highSeverityAlerts.length > 0 && (
          <Card className="story-card mb-8 border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                High Priority Alerts - Immediate Action Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {highSeverityAlerts.map((alert) => (
                <Alert key={alert.id} variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="flex items-center gap-2">
                    {alert.disease_name.toUpperCase()} Cluster
                    {alert.city && (
                      <Badge variant="outline" className="ml-2">
                        <MapPin className="w-3 h-3 mr-1" />
                        {alert.city}
                      </Badge>
                    )}
                  </AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-2">
                      <p className="font-semibold">{alert.recommendation}</p>
                      <div className="flex gap-4 text-sm">
                        <span><Users className="w-4 h-4 inline mr-1" />{alert.case_count} cases</span>
                        <span>{alert.percentage}% of total</span>
                        <span>Confidence: {Math.round(alert.confidence_score * 100)}%</span>
                      </div>
                      {alert.ai_assessment && (
                        <p className="text-sm mt-2 p-2 bg-background/50 rounded">{alert.ai_assessment}</p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </CardContent>
          </Card>
        )}

        {/* All Alerts */}
        <Card className="story-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              All Surveillance Alerts
            </CardTitle>
            <CardDescription>
              {loading ? 'Loading...' : `${alerts.length} active alerts`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-24 bg-muted rounded-lg" />
                  </div>
                ))}
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Alerts</h3>
                <p className="text-muted-foreground mb-4">
                  All monitored areas are within normal parameters
                </p>
                <Button onClick={runAnalysis} disabled={runningAnalysis}>
                  Run Surveillance Analysis
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <Card key={alert.id} className="border-l-4" style={{
                    borderLeftColor: alert.severity === 'high' ? 'hsl(var(--destructive))' : 
                                    alert.severity === 'medium' ? 'hsl(var(--primary))' : 
                                    'hsl(var(--secondary))'
                  }}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(alert.severity)}
                          <CardTitle className="text-lg">
                            {alert.disease_name.charAt(0).toUpperCase() + alert.disease_name.slice(1)} Detection
                          </CardTitle>
                        </div>
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        {alert.city && (
                          <>
                            <MapPin className="w-3 h-3" />
                            {alert.city}
                            <span className="mx-2">•</span>
                          </>
                        )}
                        {new Date(alert.created_at).toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm mb-3">{alert.recommendation}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {alert.case_count} cases
                        </span>
                        <span>{alert.percentage}% prevalence</span>
                        <span>Confidence: {Math.round(alert.confidence_score * 100)}%</span>
                        <span className="capitalize">{alert.alert_type.replace('_', ' ')}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Surveillance;
