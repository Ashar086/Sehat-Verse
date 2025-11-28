import { useState, useRef, useEffect } from "react";
import * as LangChain from "langchain";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { trackAgentVisit } from "@/utils/trackAgentVisit";
import {
  Upload,
  Brain,
  AlertCircle,
  CheckCircle,
  Activity,
  FileImage,
  Loader2,
  Eye,
  EyeOff,
  Cpu,
} from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { inferPneumonia, inferBreastCancer, inferBone, inferSkin, inferBrainTumor, loadImageFromBase64, type ModelType } from "@/lib/modelInference";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Imaging = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [heatmapImage, setHeatmapImage] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [analysis, setAnalysis] = useState<any>(null);
  const [mlResult, setMlResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelType>("gemini");
  const [xrayType, setXrayType] = useState<string>("chest");
  const [sessionId] = useState(() => crypto.randomUUID());
  
  // Image adjustment controls
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [zoom, setZoom] = useState(100);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Track agent visit on mount
  useEffect(() => {
    trackAgentVisit('Imaging Agent');
  }, []);

  // LangChain snippet for Imaging page
  useEffect(() => {
    (async () => {
      try {
        const lc = (LangChain as any);
        console.log("LangChain snippet running on Imaging page", lc?.version || "no-version");
      } catch (err) {
        console.warn("LangChain init error (imaging)", err);
      }
    })();
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setSelectedImage(base64);
      setHeatmapImage(null);
      setAnalysis(null);
      setMlResult(null);
      // Reset adjustments
      setBrightness(100);
      setContrast(100);
      setZoom(100);
    };
    reader.readAsDataURL(file);

    toast({
      title: "Image Loaded",
      description: "X-ray image uploaded successfully. Ready for analysis.",
    });
  };

  const handleAnalyze = async () => {
    if (!selectedImage) {
      toast({
        title: "No Image",
        description: "Please upload an X-ray image first",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);
    setHeatmapImage(null);
    setMlResult(null);

    try {
      // If using ML models
      if (selectedModel !== "gemini") {
        try {
          const imageElement = await loadImageFromBase64(selectedImage);
          
          let result;
          let modelName = "";
          
          switch (selectedModel) {
            case "pneumonia":
              result = await inferPneumonia(imageElement);
              modelName = "Pneumonia Detection";
              break;
            case "breastCancer":
              result = await inferBreastCancer(imageElement);
              modelName = "Breast Cancer Detection";
              break;
            case "bone":
              result = await inferBone(imageElement);
              modelName = "Bone Fracture Detection";
              break;
            case "skin":
              result = await inferSkin(imageElement);
              modelName = "Skin Condition Detection";
              break;
            case "brainTumor":
              result = await inferBrainTumor(imageElement);
              modelName = "Brain Tumor Detection";
              break;
            default:
              throw new Error("Unknown model selected");
          }

          setMlResult(result);

          // Map ML result to risk level
          const isAbnormal = result.prediction.toLowerCase().includes('pneumonia') || 
                            result.prediction.toLowerCase().includes('malignant') ||
                            result.prediction.toLowerCase().includes('fracture') ||
                            result.prediction.toLowerCase().includes('abnormal') ||
                            result.prediction.toLowerCase().includes('tumor');
          const riskLevel = isAbnormal ? (result.confidence > 80 ? "high" : "medium") : "low";

          setAnalysis({
            success: true,
            analysis: `**ML Model Analysis (${modelName})**\n\nPrediction: ${result.prediction}\nConfidence: ${result.confidence}%\n\nProbabilities:\n${Object.entries(result.probabilities).map(([key, val]) => `- ${key}: ${val}%`).join('\n')}`,
            riskLevel,
            confidence: result.confidence,
            reasoning: `ML model ${modelName} analyzed the image with ${result.confidence}% confidence.`,
            nextAction: isAbnormal ? "doctor_review" : "routine_followup",
          });

          toast({
            title: `✓ ${modelName} Complete`,
            description: `Prediction: ${result.prediction} (${result.confidence}% confidence)`,
          });

        } catch (mlError: any) {
          console.error('ML inference error:', mlError);
          
          toast({
            title: "Model Loading Failed",
            description: "Custom models require proper TensorFlow.js format with weight files. Using Gemini AI instead.",
            variant: "destructive",
          });
          
          // Automatically fall back to Gemini AI
          console.log('Falling back to Gemini AI Vision...');
          setSelectedModel("gemini");
          await runGeminiAnalysis();
          return;
        }
      } else {
        // Use Gemini AI
        await runGeminiAnalysis();
      }
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze X-ray. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runGeminiAnalysis = async () => {
    if (!selectedImage) return;

    const { data, error } = await supabase.functions.invoke("imaging-agent", {
      body: {
        imageBase64: selectedImage,
        analysisType: xrayType,
        patientContext: null,
        sessionId: sessionId,
      },
    });

    if (error) throw error;

    setAnalysis(data);
    
    // Generate heatmap visualization if regions are available
    if (data.heatmapUrl) {
      try {
        const regions = JSON.parse(data.heatmapUrl);
        const heatmapCanvas = await generateHeatmapOverlay(selectedImage, regions);
        setHeatmapImage(heatmapCanvas);
      } catch (e) {
        console.error('Failed to generate heatmap:', e);
      }
    }

    // Show appropriate toast based on risk level
    if (data.riskLevel === "critical" || data.riskLevel === "high") {
      toast({
        title: "⚠️ High Risk Detected",
        description: "Immediate medical review recommended. See details below.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "✓ Analysis Complete",
        description: `Risk level: ${data.riskLevel}. Review findings below.`,
      });
    }
  };

  const generateHeatmapOverlay = (baseImage: string, regions: any[]): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.resolve(baseImage);

    const img = new Image();
    img.src = baseImage;
    
    return new Promise<string>((resolve) => {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw original image
        ctx.drawImage(img, 0, 0);
        
        // Draw heatmap regions with medical-grade visualization
        regions.forEach((region: any) => {
          const x = (region.x / 100) * canvas.width;
          const y = (region.y / 100) * canvas.height;
          const radius = (region.size / 100) * Math.min(canvas.width, canvas.height);
          
          // Enhanced heat map colors with better visibility
          let centerColor, edgeColor, borderColor, labelBg;
          if (region.severity === 'high' || region.severity === 'critical') {
            centerColor = 'rgba(255, 0, 0, 0.7)';    // Intense red for damaged area
            edgeColor = 'rgba(255, 100, 0, 0.3)';    // Orange fade
            borderColor = 'rgba(255, 0, 0, 1)';       // Solid red border
            labelBg = 'rgba(255, 0, 0, 0.9)';
          } else if (region.severity === 'medium') {
            centerColor = 'rgba(255, 165, 0, 0.6)';  // Orange for moderate concern
            edgeColor = 'rgba(255, 200, 0, 0.3)';    // Yellow fade
            borderColor = 'rgba(255, 165, 0, 1)';     // Solid orange border
            labelBg = 'rgba(255, 165, 0, 0.9)';
          } else {
            centerColor = 'rgba(255, 200, 0, 0.5)';  // Yellow for low concern
            edgeColor = 'rgba(255, 255, 100, 0.2)';  // Light yellow fade
            borderColor = 'rgba(255, 200, 0, 1)';     // Solid yellow border
            labelBg = 'rgba(255, 200, 0, 0.9)';
          }
          
          // Draw heated region with radial gradient
          const gradient = ctx.createRadialGradient(x, y, radius * 0.1, x, y, radius);
          gradient.addColorStop(0, centerColor);     // Intense center
          gradient.addColorStop(0.5, edgeColor);      // Fading middle
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)'); // Transparent edge
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
          
          // Draw multiple border rings for emphasis
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.stroke();
          
          // Inner ring for high severity
          if (region.severity === 'high' || region.severity === 'critical') {
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, radius * 0.7, 0, Math.PI * 2);
            ctx.stroke();
          }
          
          // Add label with background
          const labelText = region.area || 'Abnormality';
          ctx.font = 'bold 16px Arial';
          const textMetrics = ctx.measureText(labelText);
          const labelX = x - textMetrics.width / 2;
          const labelY = y - radius - 15;
          
          // Label background
          ctx.fillStyle = labelBg;
          ctx.fillRect(labelX - 5, labelY - 18, textMetrics.width + 10, 24);
          
          // Label text
          ctx.fillStyle = 'white';
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 2;
          ctx.strokeText(labelText, labelX, labelY);
          ctx.fillText(labelText, labelX, labelY);
          
          // Add severity indicator
          ctx.font = 'bold 12px Arial';
          ctx.fillStyle = 'white';
          const severityText = region.severity.toUpperCase();
          const severityY = labelY + 20;
          ctx.strokeText(severityText, labelX, severityY);
          ctx.fillText(severityText, labelX, severityY);
        });
        
        resolve(canvas.toDataURL());
      };
    });
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "critical":
        return "from-red-600 to-red-700";
      case "high":
        return "from-orange-500 to-red-500";
      case "medium":
        return "from-yellow-500 to-orange-500";
      case "low":
        return "from-green-500 to-emerald-500";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case "critical":
      case "high":
        return <AlertCircle className="w-6 h-6" />;
      case "medium":
        return <Activity className="w-6 h-6" />;
      case "low":
        return <CheckCircle className="w-6 h-6" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <BackButton to="/dashboard" />
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Imaging Agent</h1>
              <Badge className="agent-badge">
                <Brain className="w-3 h-3" />
                AI X-ray Analysis
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Image Upload & Display */}
          <div className="space-y-6">
            {/* Model Selection Card */}
            <Card className="story-card p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-primary" />
                Select Analysis Model
              </h2>
              <Select value={selectedModel} onValueChange={(value: ModelType) => setSelectedModel(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      <div>
                        <p className="font-semibold">Gemini AI Vision</p>
                        <p className="text-xs text-muted-foreground">General X-ray analysis with heatmap</p>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="bone">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4" />
                      <div>
                        <p className="font-semibold">Bone Fracture Detection</p>
                        <p className="text-xs text-muted-foreground">Specialized model for bone X-rays</p>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="skin">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4" />
                      <div>
                        <p className="font-semibold">Skin Condition Detection</p>
                        <p className="text-xs text-muted-foreground">Specialized model for skin imaging</p>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="brainTumor">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4" />
                      <div>
                        <p className="font-semibold">Brain Tumor Detection</p>
                        <p className="text-xs text-muted-foreground">Specialized model for brain scans</p>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="pneumonia">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4" />
                      <div>
                        <p className="font-semibold">Pneumonia Detection CNN</p>
                        <p className="text-xs text-muted-foreground">Trained model for chest X-rays</p>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="breastCancer">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4" />
                      <div>
                        <p className="font-semibold">Breast Cancer Detection CNN</p>
                        <p className="text-xs text-muted-foreground">Trained model for mammograms</p>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-3">
                {selectedModel === "gemini" && "✨ Uses Google Gemini Vision AI for general analysis"}
                {selectedModel === "bone" && "🔬 Specialized model trained on bone X-ray dataset"}
                {selectedModel === "skin" && "🔬 Specialized model trained on skin imaging dataset"}
                {selectedModel === "brainTumor" && "🔬 Specialized model trained on brain scan dataset"}
                {selectedModel === "pneumonia" && "🔬 Specialized CNN model trained on chest X-ray dataset"}
                {selectedModel === "breastCancer" && "🔬 Specialized CNN model trained on mammogram dataset"}
              </p>
            </Card>

            {/* X-ray Type Selector - Only show for Gemini AI */}
            {selectedModel === "gemini" && (
              <Card className="story-card p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <FileImage className="w-5 h-5 text-primary" />
                  X-ray Type
                </h2>
                <Select value={xrayType} onValueChange={setXrayType}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Select X-ray type" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-50">
                    <SelectItem value="chest">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        <div>
                          <p className="font-semibold">Chest X-ray</p>
                          <p className="text-xs text-muted-foreground">Lungs, heart, ribs</p>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="bone">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        <div>
                          <p className="font-semibold">Bone X-ray</p>
                          <p className="text-xs text-muted-foreground">Fractures, skeletal issues</p>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="abdomen">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        <div>
                          <p className="font-semibold">Abdomen X-ray</p>
                          <p className="text-xs text-muted-foreground">Gastrointestinal tract</p>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="skull">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        <div>
                          <p className="font-semibold">Skull X-ray</p>
                          <p className="text-xs text-muted-foreground">Head, cranial structures</p>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="spine">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        <div>
                          <p className="font-semibold">Spine X-ray</p>
                          <p className="text-xs text-muted-foreground">Vertebrae, spinal cord</p>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="dental">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        <div>
                          <p className="font-semibold">Dental X-ray</p>
                          <p className="text-xs text-muted-foreground">Teeth, jaw structures</p>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="joint">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        <div>
                          <p className="font-semibold">Joint X-ray</p>
                          <p className="text-xs text-muted-foreground">Knee, elbow, shoulder, etc.</p>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="pelvis">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        <div>
                          <p className="font-semibold">Pelvis X-ray</p>
                          <p className="text-xs text-muted-foreground">Hip, pelvic bones</p>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-3">
                  📋 Select the anatomical region being examined for specialized analysis
                </p>
              </Card>
            )}

            <Card className="story-card p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <FileImage className="w-5 h-5 text-primary" />
                Upload X-ray Image
              </h2>

              {!selectedImage ? (
                <div
                  className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-semibold mb-2">Upload X-ray Image</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Click to select or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports JPG, PNG (Max 10MB)
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <div 
                      className="overflow-auto max-h-[600px]"
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}
                    >
                      <img
                        src={showHeatmap && heatmapImage ? heatmapImage : selectedImage}
                        alt="X-ray"
                        style={{
                          filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                          transform: `scale(${zoom / 100})`,
                          transformOrigin: 'center center',
                          transition: 'filter 0.2s ease, transform 0.2s ease',
                          maxWidth: 'none',
                          height: 'auto'
                        }}
                      />
                    </div>
                    {heatmapImage && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => setShowHeatmap(!showHeatmap)}
                      >
                        {showHeatmap ? (
                          <>
                            <EyeOff className="w-4 h-4 mr-2" />
                            Hide Heatmap
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-2" />
                            Show Heatmap
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Change Image
                    </Button>
                    <Button
                      className="flex-1 bg-gradient-to-r from-violet-500 to-purple-500"
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Brain className="w-4 h-4 mr-2" />
                          Analyze X-ray
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </Card>

            {/* Image Adjustment Controls */}
            {selectedImage && (
              <Card className="story-card p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Image Adjustments
                </h2>
                
                <div className="space-y-4">
                  {/* Brightness Control */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">Brightness</label>
                      <span className="text-sm text-muted-foreground">{brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="200"
                      value={brightness}
                      onChange={(e) => setBrightness(Number(e.target.value))}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>

                  {/* Contrast Control */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">Contrast</label>
                      <span className="text-sm text-muted-foreground">{contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="200"
                      value={contrast}
                      onChange={(e) => setContrast(Number(e.target.value))}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>

                  {/* Zoom Control */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">Zoom</label>
                      <span className="text-sm text-muted-foreground">{zoom}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="200"
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>

                  {/* Reset Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setBrightness(100);
                      setContrast(100);
                      setZoom(100);
                    }}
                  >
                    Reset Adjustments
                  </Button>
                </div>
              </Card>
            )}

            {/* Info Card */}
            <Card className="story-card p-6 bg-primary/5">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                How It Works
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Upload chest X-ray or medical imaging</li>
                <li>• Select model: Gemini AI or specialized CNN</li>
                <li>• AI analyzes using selected model</li>
                <li>• View predictions, confidence scores & recommendations</li>
                <li>• ⚠️ This is AI-assisted screening, not diagnosis</li>
              </ul>
              {(selectedModel === "pneumonia" || selectedModel === "breastCancer") && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-xs text-yellow-900 dark:text-yellow-100 font-semibold mb-1">
                    📝 Model Conversion Required
                  </p>
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    The .h5 models need conversion to TensorFlow.js format. Use: 
                    <code className="block mt-1 p-1 bg-yellow-100 dark:bg-yellow-900/40 rounded">
                      tensorflowjs_converter --input_format=keras model.h5 output_dir/
                    </code>
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: Analysis Results */}
          <div className="space-y-6">
            {isAnalyzing ? (
              <Card className="story-card p-12 text-center">
                <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
                <p className="text-lg font-semibold mb-2">Analyzing X-ray...</p>
                <p className="text-sm text-muted-foreground">
                  AI is examining the image and generating insights
                </p>
              </Card>
            ) : analysis ? (
              <>
                {/* Risk Assessment Card */}
                <Card className="story-card p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Risk Assessment
                    {mlResult && (
                      <Badge variant="outline" className="ml-auto">
                        <Cpu className="w-3 h-3 mr-1" />
                        {mlResult.modelUsed === 'pneumonia' ? 'Pneumonia CNN' : 'Breast Cancer CNN'}
                      </Badge>
                    )}
                  </h2>

                  <div
                    className={`p-6 rounded-xl bg-gradient-to-br ${getRiskColor(
                      analysis.riskLevel
                    )} text-white mb-4`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {getRiskIcon(analysis.riskLevel)}
                      <h3 className="text-2xl font-bold uppercase">
                        {analysis.riskLevel} Risk
                      </h3>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">{analysis.confidence}%</span>
                      <span className="text-sm opacity-90">Confidence</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm font-semibold text-muted-foreground mb-1">
                        Next Action
                      </p>
                      <p className="font-semibold">{analysis.nextAction.replace(/_/g, " ").toUpperCase()}</p>
                    </div>

                    {analysis.reasoning && (
                      <div className="p-4 bg-primary/5 rounded-lg">
                        <p className="text-sm font-semibold text-primary mb-2">
                          AI Reasoning
                        </p>
                        <p className="text-sm text-foreground/90">{analysis.reasoning}</p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* ML Model Results Card */}
                {mlResult && (
                  <Card className="story-card p-6 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200 dark:border-purple-800">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      ML Model Predictions
                    </h2>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-white/50 dark:bg-black/20 rounded-lg">
                        <p className="text-sm font-semibold text-muted-foreground mb-1">Model Type</p>
                        <p className="text-lg font-bold">
                          {mlResult.modelUsed === 'pneumonia' ? 'Pneumonia Detection CNN' : 'Breast Cancer Detection CNN'}
                        </p>
                      </div>

                      <div className="p-4 bg-white/50 dark:bg-black/20 rounded-lg">
                        <p className="text-sm font-semibold text-muted-foreground mb-1">Prediction</p>
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {mlResult.prediction}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-muted-foreground">Class Probabilities</p>
                        {Object.entries(mlResult.probabilities).map(([className, probability]: [string, any]) => (
                          <div key={className} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{className}</span>
                              <span className="font-bold">{probability}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  className.toLowerCase().includes('normal') || className.toLowerCase().includes('benign')
                                    ? 'bg-green-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${probability}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                )}

                {/* Findings Card */}
                <Card className="story-card p-6">
                  <h2 className="text-xl font-bold mb-4">Clinical Findings</h2>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
                      {analysis.analysis}
                    </p>
                  </div>
                </Card>

                {/* Recommendations Card */}
                <Card className="story-card p-6 border-primary/20">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    Recommendations
                  </h2>
                  <div className="space-y-3">
                    {analysis.riskLevel === "critical" && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">
                          🚨 CRITICAL: Immediate Action Required
                        </p>
                        <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
                          <li>• Call 1122 or visit emergency immediately</li>
                          <li>• Bring this report to the doctor</li>
                          <li>• Do not delay medical attention</li>
                        </ul>
                      </div>
                    )}

                    {analysis.riskLevel === "high" && (
                      <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                        <p className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-2">
                          ⚠️ HIGH PRIORITY: Prompt Medical Review
                        </p>
                        <ul className="text-sm text-orange-800 dark:text-orange-200 space-y-1">
                          <li>• Schedule doctor appointment within 24 hours</li>
                          <li>• Bring X-ray and report to consultation</li>
                          <li>• Monitor symptoms closely</li>
                        </ul>
                      </div>
                    )}

                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm font-semibold mb-2">General Guidance</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• This is AI-assisted screening, not a diagnosis</li>
                        <li>• Professional radiologist review is required</li>
                        <li>• Keep original X-ray for medical records</li>
                        <li>• Share this report with your healthcare provider</li>
                      </ul>
                    </div>

                    <Button
                      className="w-full bg-gradient-to-r from-primary to-primary-glow"
                      onClick={() => navigate("/trace")}
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      View AI Decision Logs
                    </Button>
                  </div>
                </Card>
              </>
            ) : (
              <Card className="story-card p-12 text-center">
                <FileImage className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-semibold mb-2">No Analysis Yet</p>
                <p className="text-sm text-muted-foreground">
                  Upload an X-ray image and click "Analyze" to get AI-powered insights
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Imaging;
