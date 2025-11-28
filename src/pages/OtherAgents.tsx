import { useState, useEffect } from "react";
import * as LangChain from "langchain";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calculator, Heart, Activity, Brain, Droplet, Shield, Loader2, ArrowLeft } from "lucide-react";

type AgentType = "calorie" | "heartrate" | "bmi" | "stress" | "water" | "ed" | null;

const OtherAgents = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedAgent, setSelectedAgent] = useState<AgentType>(null);
  const [loading, setLoading] = useState(false);

  // LangChain snippet for OtherAgents
  useEffect(() => {
    (async () => {
      try {
        const lc = (LangChain as any);
        console.log("LangChain snippet running on OtherAgents page", lc?.version || "no-version");
      } catch (err) {
        console.warn("LangChain init error (other agents)", err);
      }
    })();
  }, []);

  const agents = [
    {
      id: "calorie" as const,
      name: "Calorie Calculator",
      description: "Calculate daily calorie needs based on your profile",
      icon: Calculator,
      color: "from-indigo-500 to-purple-500",
    },
    {
      id: "heartrate" as const,
      name: "Heart Rate Calculator",
      description: "Calculate optimal heart rate zones for exercise",
      icon: Heart,
      color: "from-red-500 to-pink-500",
    },
    {
      id: "bmi" as const,
      name: "BMI Calculator",
      description: "Calculate your Body Mass Index and health category",
      icon: Activity,
      color: "from-green-500 to-emerald-500",
    },
    {
      id: "stress" as const,
      name: "Stress Evaluator",
      description: "Assess your stress level and get personalized advice",
      icon: Brain,
      color: "from-orange-500 to-amber-500",
    },
    {
      id: "water" as const,
      name: "Water Intake Calculator",
      description: "Calculate daily water consumption needs",
      icon: Droplet,
      color: "from-cyan-500 to-blue-500",
    },
    {
      id: "ed" as const,
      name: "ED Risk Calculator",
      description: "Assess erectile dysfunction risk factors",
      icon: Shield,
      color: "from-purple-500 to-violet-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => selectedAgent ? setSelectedAgent(null) : navigate("/dashboard")}
            className="group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            {selectedAgent ? "Back to Agents" : "Back to Dashboard"}
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {!selectedAgent ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Other Health Agents</h1>
              <p className="text-muted-foreground">
                Specialized tools and calculators for your health needs
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map((agent) => {
                const Icon = agent.icon;
                return (
                  <Card
                    key={agent.id}
                    className="story-card cursor-pointer hover:scale-[1.02] transition-all group"
                    onClick={() => setSelectedAgent(agent.id)}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center group-hover:animate-pulse`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                      </div>
                      <CardDescription>{agent.description}</CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </>
        ) : selectedAgent === "calorie" ? (
          <CalorieCalculator loading={loading} setLoading={setLoading} toast={toast} />
        ) : selectedAgent === "heartrate" ? (
          <HeartRateCalculator loading={loading} setLoading={setLoading} toast={toast} />
        ) : selectedAgent === "bmi" ? (
          <BMICalculator loading={loading} setLoading={setLoading} toast={toast} />
        ) : selectedAgent === "stress" ? (
          <StressEvaluator loading={loading} setLoading={setLoading} toast={toast} />
        ) : selectedAgent === "water" ? (
          <WaterCalculator loading={loading} setLoading={setLoading} toast={toast} />
        ) : selectedAgent === "ed" ? (
          <EDCalculator loading={loading} setLoading={setLoading} toast={toast} />
        ) : null}
      </div>
    </div>
  );
};

// Calorie Calculator Component
const CalorieCalculator = ({ loading, setLoading, toast }: any) => {
  const [result, setResult] = useState<any>(null);
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [activityLevel, setActivityLevel] = useState("");

  const handleCalculate = async () => {
    if (!gender || !age || !weight || !height || !activityLevel) {
      toast({ title: "Missing Information", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("calorie-agent", {
        body: { gender, age: parseInt(age), weight: parseFloat(weight), height: parseFloat(height), activity_level: activityLevel },
      });

      if (error) throw error;
      setResult(data);
      toast({ title: "Calculation Complete", description: "Your daily calorie needs have been calculated" });
    } catch (error: any) {
      toast({ title: "Calculation Failed", description: error.message || "Failed to calculate calories", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="story-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle>Calorie Calculator</CardTitle>
            <CardDescription>Calculate your daily calorie needs</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Age (years)</Label>
            <Input type="number" placeholder="Enter your age" value={age} onChange={(e) => setAge(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Weight (kg)</Label>
            <Input type="number" step="0.1" placeholder="Enter your weight" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Height (cm)</Label>
            <Input type="number" step="0.1" placeholder="Enter your height" value={height} onChange={(e) => setHeight(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Activity Level</Label>
            <Select value={activityLevel} onValueChange={setActivityLevel}>
              <SelectTrigger><SelectValue placeholder="Select activity level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sedentary">Sedentary (little or no exercise)</SelectItem>
                <SelectItem value="lightly active">Lightly Active (1-3 days/week)</SelectItem>
                <SelectItem value="moderately active">Moderately Active (3-5 days/week)</SelectItem>
                <SelectItem value="very active">Very Active (6-7 days/week)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={handleCalculate} disabled={loading} className="w-full bg-gradient-to-r from-indigo-500 to-purple-500">
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Calculating...</> : "Calculate Calories"}
        </Button>
        {result && (
          <Card className="bg-accent/50 border-primary/20">
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-2xl font-bold text-center">{Math.round(result.tdee)} calories/day</h3>
              <p className="text-sm text-center text-muted-foreground">Your Total Daily Energy Expenditure (TDEE)</p>
              <div className="p-4 bg-background/50 rounded-lg"><p className="text-sm">{result.suggestion}</p></div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};

// Heart Rate Calculator Component
const HeartRateCalculator = ({ loading, setLoading, toast }: any) => {
  const [result, setResult] = useState<any>(null);
  const [age, setAge] = useState("");

  const handleCalculate = async () => {
    if (!age) {
      toast({ title: "Missing Information", description: "Please enter your age", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("heartrate-agent", {
        body: { age: parseInt(age) },
      });

      if (error) throw error;
      setResult(data);
      toast({ title: "Calculation Complete", description: "Your heart rate zones have been calculated" });
    } catch (error: any) {
      toast({ title: "Calculation Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="story-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle>Heart Rate Calculator</CardTitle>
            <CardDescription>Calculate optimal heart rate zones for exercise</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Age (years)</Label>
          <Input type="number" placeholder="Enter your age" value={age} onChange={(e) => setAge(e.target.value)} />
        </div>
        <Button onClick={handleCalculate} disabled={loading} className="w-full bg-gradient-to-r from-red-500 to-pink-500">
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Calculating...</> : "Calculate Heart Rate Zones"}
        </Button>
        {result && (
          <Card className="bg-accent/50 border-primary/20">
            <CardContent className="pt-6 space-y-4">
              <div className="text-center">
                <h3 className="text-2xl font-bold">{result.mhr} bpm</h3>
                <p className="text-sm text-muted-foreground">Maximum Heart Rate</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-background/50 rounded-lg">
                  <p className="font-semibold mb-1">Moderate Intensity Zone</p>
                  <p className="text-2xl font-bold">{Math.round(result.moderate_low)}-{Math.round(result.moderate_high)} bpm</p>
                </div>
                <div className="p-4 bg-background/50 rounded-lg">
                  <p className="font-semibold mb-1">Vigorous Intensity Zone</p>
                  <p className="text-2xl font-bold">{Math.round(result.vigorous_low)}-{Math.round(result.vigorous_high)} bpm</p>
                </div>
              </div>
              <div className="p-4 bg-background/50 rounded-lg"><p className="text-sm">{result.suggestion}</p></div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};

// BMI Calculator Component
const BMICalculator = ({ loading, setLoading, toast }: any) => {
  const [result, setResult] = useState<any>(null);
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");

  const handleCalculate = async () => {
    if (!weight || !height) {
      toast({ title: "Missing Information", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("bmi-agent", {
        body: { weight: parseFloat(weight), height: parseFloat(height) / 100 },
      });

      if (error) throw error;
      setResult(data);
      toast({ title: "Calculation Complete", description: "Your BMI has been calculated" });
    } catch (error: any) {
      toast({ title: "Calculation Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="story-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle>BMI Calculator</CardTitle>
            <CardDescription>Calculate your Body Mass Index</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Weight (kg)</Label>
            <Input type="number" step="0.1" placeholder="Enter your weight" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Height (cm)</Label>
            <Input type="number" step="0.1" placeholder="Enter your height" value={height} onChange={(e) => setHeight(e.target.value)} />
          </div>
        </div>
        <Button onClick={handleCalculate} disabled={loading} className="w-full bg-gradient-to-r from-green-500 to-emerald-500">
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Calculating...</> : "Calculate BMI"}
        </Button>
        {result && (
          <Card className="bg-accent/50 border-primary/20">
            <CardContent className="pt-6 space-y-4">
              <div className="text-center">
                <h3 className="text-2xl font-bold">{result.bmi.toFixed(1)}</h3>
                <p className="text-sm text-muted-foreground">Your BMI</p>
                <p className="font-semibold mt-2">{result.category}</p>
              </div>
              <div className="p-4 bg-background/50 rounded-lg"><p className="text-sm">{result.suggestion}</p></div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};

// Stress Evaluator Component
const StressEvaluator = ({ loading, setLoading, toast }: any) => {
  const [result, setResult] = useState<any>(null);
  const [anxiety, setAnxiety] = useState("");
  const [sleepHours, setSleepHours] = useState("");
  const [exercise, setExercise] = useState("");

  const handleCalculate = async () => {
    if (!anxiety || !sleepHours || !exercise) {
      toast({ title: "Missing Information", description: "Please answer all questions", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("stress-agent", {
        body: { anxiety, sleep_hours: sleepHours, exercise },
      });

      if (error) throw error;
      setResult(data);
      toast({ title: "Assessment Complete", description: "Your stress level has been evaluated" });
    } catch (error: any) {
      toast({ title: "Assessment Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="story-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle>Stress Evaluator</CardTitle>
            <CardDescription>Assess your stress level</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>How often do you feel anxious?</Label>
            <Select value={anxiety} onValueChange={setAnxiety}>
              <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Never">Never</SelectItem>
                <SelectItem value="Occasionally">Occasionally</SelectItem>
                <SelectItem value="Frequently">Frequently</SelectItem>
                <SelectItem value="Always">Always</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>How many hours do you sleep per night?</Label>
            <Select value={sleepHours} onValueChange={setSleepHours}>
              <SelectTrigger><SelectValue placeholder="Select hours" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Less than 6">Less than 6</SelectItem>
                <SelectItem value="6-7">6-7</SelectItem>
                <SelectItem value="8-9">8-9</SelectItem>
                <SelectItem value="More than 9">More than 9</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Do you exercise regularly?</Label>
            <Select value={exercise} onValueChange={setExercise}>
              <SelectTrigger><SelectValue placeholder="Select answer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={handleCalculate} disabled={loading} className="w-full bg-gradient-to-r from-orange-500 to-amber-500">
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Evaluating...</> : "Evaluate Stress Level"}
        </Button>
        {result && (
          <Card className="bg-accent/50 border-primary/20">
            <CardContent className="pt-6 space-y-4">
              <div className="text-center">
                <h3 className="text-2xl font-bold">{result.stress_level}</h3>
                <p className="text-sm text-muted-foreground">Stress Score: {result.score}</p>
              </div>
              <div className="p-4 bg-background/50 rounded-lg"><p className="text-sm">{result.suggestion}</p></div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};

// Water Calculator Component
const WaterCalculator = ({ loading, setLoading, toast }: any) => {
  const [result, setResult] = useState<any>(null);
  const [weight, setWeight] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [environment, setEnvironment] = useState("");
  const [healthCondition, setHealthCondition] = useState("");

  const handleCalculate = async () => {
    if (!weight || !activityLevel || !environment || !healthCondition) {
      toast({ title: "Missing Information", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("water-agent", {
        body: { weight: parseFloat(weight), activity_level: activityLevel, environment, health_condition: healthCondition },
      });

      if (error) throw error;
      setResult(data);
      toast({ title: "Calculation Complete", description: "Your water intake needs have been calculated" });
    } catch (error: any) {
      toast({ title: "Calculation Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="story-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <Droplet className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle>Water Intake Calculator</CardTitle>
            <CardDescription>Calculate your daily water needs</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Weight (kg)</Label>
            <Input type="number" step="0.1" placeholder="Enter your weight" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Activity Level</Label>
            <Select value={activityLevel} onValueChange={setActivityLevel}>
              <SelectTrigger><SelectValue placeholder="Select activity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Sedentary">Sedentary</SelectItem>
                <SelectItem value="Lightly active">Lightly active</SelectItem>
                <SelectItem value="Moderately active">Moderately active</SelectItem>
                <SelectItem value="Very active">Very active</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Environment</Label>
            <Select value={environment} onValueChange={setEnvironment}>
              <SelectTrigger><SelectValue placeholder="Select environment" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="Hot">Hot</SelectItem>
                <SelectItem value="Humid">Humid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Health Condition</Label>
            <Select value={healthCondition} onValueChange={setHealthCondition}>
              <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Healthy">Healthy</SelectItem>
                <SelectItem value="Pregnant">Pregnant</SelectItem>
                <SelectItem value="Lactating">Lactating</SelectItem>
                <SelectItem value="Diabetic">Diabetic</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={handleCalculate} disabled={loading} className="w-full bg-gradient-to-r from-cyan-500 to-blue-500">
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Calculating...</> : "Calculate Water Intake"}
        </Button>
        {result && (
          <Card className="bg-accent/50 border-primary/20">
            <CardContent className="pt-6 space-y-4">
              <div className="text-center">
                <h3 className="text-2xl font-bold">{(result.water_intake / 1000).toFixed(2)} liters/day</h3>
                <p className="text-sm text-muted-foreground">{result.water_intake} ml/day</p>
              </div>
              <div className="p-4 bg-background/50 rounded-lg"><p className="text-sm">{result.suggestion}</p></div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};

// ED Calculator Component
const EDCalculator = ({ loading, setLoading, toast }: any) => {
  const [result, setResult] = useState<any>(null);
  const [difficulty, setDifficulty] = useState("");
  const [smoking, setSmoking] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [exercise, setExercise] = useState("");
  const [stress, setStress] = useState("");
  const [heartDisease, setHeartDisease] = useState("");

  const handleCalculate = async () => {
    if (!difficulty || !smoking || !bloodPressure || !exercise || !stress || !heartDisease) {
      toast({ title: "Missing Information", description: "Please answer all questions", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("ed-agent", {
        body: { difficulty, smoking, blood_pressure: bloodPressure, exercise, stress, heart_disease: heartDisease },
      });

      if (error) throw error;
      setResult(data);
      toast({ title: "Assessment Complete", description: "Your risk assessment is ready" });
    } catch (error: any) {
      toast({ title: "Assessment Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="story-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle>ED Risk Calculator</CardTitle>
            <CardDescription>Assess erectile dysfunction risk factors</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Difficulty maintaining an erection?</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Never">Never</SelectItem>
                <SelectItem value="Occasionally">Occasionally</SelectItem>
                <SelectItem value="Frequently">Frequently</SelectItem>
                <SelectItem value="Always">Always</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Do you smoke?</Label>
            <Select value={smoking} onValueChange={setSmoking}>
              <SelectTrigger><SelectValue placeholder="Select answer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Do you have high blood pressure?</Label>
            <Select value={bloodPressure} onValueChange={setBloodPressure}>
              <SelectTrigger><SelectValue placeholder="Select answer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Do you exercise regularly?</Label>
            <Select value={exercise} onValueChange={setExercise}>
              <SelectTrigger><SelectValue placeholder="Select answer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Stress level?</Label>
            <Select value={stress} onValueChange={setStress}>
              <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Moderate">Moderate</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Do you have heart disease?</Label>
            <Select value={heartDisease} onValueChange={setHeartDisease}>
              <SelectTrigger><SelectValue placeholder="Select answer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={handleCalculate} disabled={loading} className="w-full bg-gradient-to-r from-purple-500 to-violet-500">
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Assessing...</> : "Assess Risk"}
        </Button>
        {result && (
          <Card className="bg-accent/50 border-primary/20">
            <CardContent className="pt-6 space-y-4">
              <div className="text-center">
                <h3 className="text-2xl font-bold">{result.risk_level}</h3>
                <p className="text-sm text-muted-foreground">Risk Score: {result.score}</p>
              </div>
              <div className="p-4 bg-background/50 rounded-lg"><p className="text-sm">{result.suggestion}</p></div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};

export default OtherAgents;
